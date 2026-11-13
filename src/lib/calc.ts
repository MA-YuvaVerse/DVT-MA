/**
 * Pure business calculations. No database access, so they are unit tested
 * and shared by pages, reports and the importer.
 */
import { OPEN_STATUSES, WON_STATUS, type PipelineRule } from "./constants";

export type Num = number | null | undefined;
const n = (v: Num) => (v == null || Number.isNaN(v) ? 0 : v);

export interface QuoteLike {
  cost: Num;
  isSelected: boolean;
  status?: string;
}

export interface VersionLike {
  versionNo: number;
  status: string;
  proposalValue: Num;
  internalCost?: Num;
  mappingAcres?: Num;
  flightAcres?: Num;
  isLinear?: boolean;
  linearMiles?: Num;
  requestDate?: Date | null;
  createdAt?: Date;
  acqQuotes?: QuoteLike[];
  mappingQuotes?: QuoteLike[];
}

export interface ProbabilitySettings {
  preparing: number;
  open: number;
  openStale: number;
  high: number;
  staleDays: number;
}

export const DEFAULT_PROBABILITY: ProbabilitySettings = {
  preparing: 40,
  open: 40,
  openStale: 15,
  high: 75,
  staleDays: 45,
};

export function isOpen(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

export function safeDiv(a: Num, b: Num): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export function selectedTotal(quotes: QuoteLike[] = []): number {
  return quotes.filter((q) => q.isSelected).reduce((s, q) => s + n(q.cost), 0);
}

/** Costing for one version: selected vendor quotes + internal costs vs the quoted value. */
export function versionCosting(v: VersionLike) {
  const acqCost = selectedTotal(v.acqQuotes);
  const mappingCost = selectedTotal(v.mappingQuotes);
  const internalCost = n(v.internalCost);
  const totalCost = acqCost + mappingCost + internalCost;
  const value = v.proposalValue == null ? null : v.proposalValue;
  // no costs entered yet -> margin unknown (not 100%)
  const margin = value == null || totalCost === 0 ? null : value - totalCost;
  return {
    acqCost,
    mappingCost,
    internalCost,
    totalCost,
    value,
    margin,
    marginPct: safeDiv(margin, value),
    acqPctOfValue: safeDiv(acqCost, value),
    mappingPctOfValue: safeDiv(mappingCost, value),
    pricePerAcre: safeDiv(value, v.mappingAcres),
    pricePerMile: v.isLinear ? safeDiv(value, v.linearMiles) : null,
    acqCostPerAcre: safeDiv(acqCost || null, v.flightAcres || v.mappingAcres),
  };
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/** Probability % used only to weight the open pipeline. */
export function versionProbability(v: VersionLike, s: ProbabilitySettings = DEFAULT_PROBABILITY, today = new Date()) {
  switch (v.status) {
    case WON_STATUS:
      return 100;
    case "Open/HIGH":
      return s.high;
    case "Preparing Proposal":
      return s.preparing;
    case "Open": {
      const since = v.requestDate ?? v.createdAt;
      if (since && daysBetween(since, today) > s.staleDays) return s.openStale;
      return s.open;
    }
    default:
      return 0;
  }
}

function pick(values: number[], rule: PipelineRule, latestIndex: number): number {
  if (values.length === 0) return 0;
  switch (rule) {
    case "MIN":
      return Math.min(...values);
    case "AVERAGE":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "MEDIAN": {
      const s = [...values].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    case "LATEST":
      return values[latestIndex];
    case "MAX":
    default:
      return Math.max(...values);
  }
}

/**
 * Pipeline for a proposal. Versions are alternatives for one opportunity, so
 * their values are never added together: one value is chosen by the rule.
 */
export function proposalPipeline(
  versions: VersionLike[],
  rule: PipelineRule = "MAX",
  s: ProbabilitySettings = DEFAULT_PROBABILITY,
  today = new Date(),
) {
  const open = versions.filter((v) => isOpen(v.status) && v.proposalValue != null);
  if (open.length === 0) return { value: 0, weighted: 0, probability: 0, openVersions: 0 };
  const latestIdx = open.reduce((best, v, i) => (v.versionNo > open[best].versionNo ? i : best), 0);
  const values = open.map((v) => n(v.proposalValue));
  const weightedValues = open.map((v) => n(v.proposalValue) * (versionProbability(v, s, today) / 100));
  const value = pick(values, rule, latestIdx);
  const weighted = pick(weightedValues, rule, latestIdx);
  return { value, weighted, probability: value ? (weighted / value) * 100 : 0, openVersions: open.length };
}

const STATUS_PRIORITY = [
  WON_STATUS,
  "Open/HIGH",
  "Open",
  "Preparing Proposal",
  "On Hold",
  "Client Won/DVT Lost",
  "Client Lost",
  "Abandoned",
  "Cancelled",
];

/** Roll-up status of a proposal from its versions. */
export function proposalStatus(versions: { status: string }[]): string {
  if (versions.length === 0) return "Preparing Proposal";
  let best = STATUS_PRIORITY.length;
  for (const v of versions) {
    const i = STATUS_PRIORITY.indexOf(v.status);
    if (i >= 0 && i < best) best = i;
  }
  return STATUS_PRIORITY[best] ?? versions[versions.length - 1].status;
}

/** Value won: the won versions of a proposal (a client may award more than one area). */
export function wonValue(versions: VersionLike[]) {
  return versions.filter((v) => v.status === WON_STATUS).reduce((s, v) => s + n(v.proposalValue), 0);
}

/** Value proposed, counted once per proposal (highest version). */
export function proposedValue(versions: VersionLike[]) {
  const vals = versions.map((v) => n(v.proposalValue));
  return vals.length ? Math.max(...vals) : 0;
}

export function projectMargin(p: { contractValue: Num; billedAmount?: Num; acqCost: Num; processingCost: Num; mobCosts: Num }) {
  const value = p.contractValue ?? p.billedAmount ?? null;
  const cost = n(p.acqCost) + n(p.processingCost) + n(p.mobCosts);
  const margin = value == null ? null : value - cost;
  return { value, cost, margin, marginPct: safeDiv(margin, value) };
}

export function dayDiff(from?: Date | null, to?: Date | null): number | null {
  if (!from || !to) return null;
  return daysBetween(from, to);
}
