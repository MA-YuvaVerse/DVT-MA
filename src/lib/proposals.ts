import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { currentVersion, proposalPipeline, proposalStatus, proposedValue, versionCosting, wonValue } from "./calc";
import { toNum, cityState } from "./format";
import { getPipelineConfig } from "./settings";

export const summaryInclude = {
  company: true,
  clientContact: true,
  dvtPm: true,
  parentProject: { select: { id: true, number: true } },
  projects: { select: { id: true, number: true } },
  versions: {
    orderBy: { versionNo: "asc" },
    include: {
      acqQuotes: { include: { vendor: true, sensor: true } },
      mappingQuotes: { include: { vendor: true } },
    },
  },
} satisfies Prisma.ProposalInclude;

export type ProposalWithVersions = Prisma.ProposalGetPayload<{ include: typeof summaryInclude }>;

export function plainVersion(v: ProposalWithVersions["versions"][number]) {
  return {
    versionNo: v.versionNo,
    status: v.status,
    proposalValue: toNum(v.proposalValue),
    internalCost: toNum(v.internalCost),
    mappingAcres: toNum(v.mappingAcres),
    flightAcres: toNum(v.flightAcres),
    isLinear: v.isLinear,
    linearMiles: toNum(v.linearMiles),
    requestDate: v.requestDate,
    createdAt: v.createdAt,
    acqQuotes: v.acqQuotes.map((q) => ({ cost: toNum(q.cost), isSelected: q.isSelected, status: q.status })),
    mappingQuotes: v.mappingQuotes.map((q) => ({ cost: toNum(q.cost), isSelected: q.isSelected, status: q.status })),
  };
}

/** Version number of the proposal's current version (falls back to the latest). */
export function currentVersionNo(p: { currentVersionId: string | null; versions: { id: string; versionNo: number }[] }) {
  return currentVersion(p.versions, p.versions.find((v) => v.id === p.currentVersionId)?.versionNo)?.versionNo ?? null;
}

export function proposalTitle(p: ProposalWithVersions) {
  const no = currentVersionNo(p);
  return p.versions.find((v) => v.versionNo === no)?.title ?? "(untitled)";
}

/** "202600361 Client Project City ST" — the concatenated display name. */
export function proposalDisplayName(p: ProposalWithVersions) {
  return [p.number, p.company.shortName ?? p.company.name, proposalTitle(p), cityState(p.city, p.state).replace(",", "")]
    .filter(Boolean)
    .join(" ");
}

export async function loadProposalSummaries(where: Prisma.ProposalWhereInput = {}) {
  const [rows, cfg] = await Promise.all([
    prisma.proposal.findMany({ where, include: summaryInclude, orderBy: { number: "desc" } }),
    getPipelineConfig(),
  ]);
  const today = new Date();
  return rows.map((p) => {
    const versions = p.versions.map(plainVersion);
    const curNo = currentVersionNo(p);
    const pipe = proposalPipeline(versions, cfg.rule, cfg.prob, today, curNo);
    const latest = p.versions.find((v) => v.versionNo === curNo) ?? p.versions[p.versions.length - 1];
    const followUps = p.versions.map((v) => v.followUpDate).filter((d): d is Date => !!d);
    const requestDates = p.versions.map((v) => v.requestDate).filter((d): d is Date => !!d);
    const best = latest;
    const selAcq = best?.acqQuotes.filter((q) => q.isSelected) ?? [];
    const selMap = best?.mappingQuotes.filter((q) => q.isSelected) ?? [];
    const bestCosting = best ? versionCosting(plainVersion(best)) : null;
    return {
      id: p.id,
      number: p.number,
      title: proposalTitle(p),
      displayName: proposalDisplayName(p),
      client: p.company.shortName ?? p.company.name,
      companyId: p.companyId,
      clientPm: p.clientContact ? `${p.clientContact.firstName} ${p.clientContact.lastName}`.trim() : null,
      dvtPm: p.dvtPm?.initials ?? null,
      location: cityState(p.city, p.state),
      opportunityType: p.opportunityType,
      parentProject: p.parentProject?.number ?? null,
      projects: p.projects.map((x) => x.number),
      status: proposalStatus(p.versions),
      versionCount: p.versions.length,
      currentCode: latest?.code ?? null,
      currentValue: toNum(latest?.proposalValue),
      linearMiles: latest?.isLinear ? toNum(latest.linearMiles) : null,
      requestDate: requestDates.length ? new Date(Math.min(...requestDates.map((d) => d.getTime()))) : p.createdAt,
      followUpDate: followUps.length ? new Date(Math.min(...followUps.map((d) => d.getTime()))) : null,
      projectType: latest?.projectType ?? null,
      sensorType: latest?.sensorType ?? null,
      deliverables: latest?.deliverables ?? null,
      mappingAcres: toNum(latest?.mappingAcres),
      comments: latest?.comments ?? p.comments,
      pipelineValue: pipe.value,
      weightedValue: pipe.weighted,
      probability: pipe.probability,
      proposedValue: proposedValue(versions, curNo),
      wonValue: wonValue(versions),
      hasValue: p.versions.some((v) => v.proposalValue != null),
      likelyAcqVendor: selAcq.map((q) => q.vendor.shortName ?? q.vendor.name).join(", ") || null,
      mappingVendor: selMap.map((q) => q.vendor.shortName ?? q.vendor.name).join(", ") || null,
      likelyAcqCost: bestCosting?.acqCost || null,
      mappingCost: bestCosting?.mappingCost || null,
      margin: bestCosting?.margin ?? null,
      createdAt: p.createdAt,
    };
  });
}

export type ProposalSummary = Awaited<ReturnType<typeof loadProposalSummaries>>[number];
