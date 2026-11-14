import { prisma } from "./db";
import { DEFAULT_PROBABILITY, type ProbabilitySettings } from "./calc";
import { PIPELINE_RULES, type PipelineRule } from "./constants";

export const SETTING_DEFAULTS = {
  pipelineRule: "CURRENT",
  probRequest: String(DEFAULT_PROBABILITY.request),
  probQualifying: String(DEFAULT_PROBABILITY.qualifying),
  probPreparing: String(DEFAULT_PROBABILITY.preparing),
  probOpen: String(DEFAULT_PROBABILITY.open),
  probOpenStale: String(DEFAULT_PROBABILITY.openStale),
  probHigh: String(DEFAULT_PROBABILITY.high),
  staleDays: String(DEFAULT_PROBABILITY.staleDays),
  followUpDays: "15",
  proposalYearDigits: "4",
  projectNumberInfix: "18",
  companyName: "DroneView Technologies",
  showReportsCosting: "false",
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany();
  const out: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out as Record<SettingKey, string>;
}

export function probabilitySettings(s: Record<SettingKey, string>): ProbabilitySettings {
  return {
    request: Number(s.probRequest),
    qualifying: Number(s.probQualifying),
    preparing: Number(s.probPreparing),
    open: Number(s.probOpen),
    openStale: Number(s.probOpenStale),
    high: Number(s.probHigh),
    staleDays: Number(s.staleDays),
  };
}

export function pipelineRule(s: Record<SettingKey, string>): PipelineRule {
  return (s.pipelineRule in PIPELINE_RULES ? s.pipelineRule : "CURRENT") as PipelineRule;
}

export async function getPipelineConfig() {
  const s = await getSettings();
  return { rule: pipelineRule(s), prob: probabilitySettings(s), settings: s };
}
