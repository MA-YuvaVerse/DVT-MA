import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { proposalPipeline, proposalStatus, proposedValue, versionCosting, wonValue } from "./calc";
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

export function proposalTitle(p: ProposalWithVersions) {
  const latest = p.versions[p.versions.length - 1];
  return latest?.title ?? "(untitled)";
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
    const pipe = proposalPipeline(versions, cfg.rule, cfg.prob, today);
    const latest = p.versions[p.versions.length - 1];
    const followUps = p.versions.map((v) => v.followUpDate).filter((d): d is Date => !!d);
    const requestDates = p.versions.map((v) => v.requestDate).filter((d): d is Date => !!d);
    const best = p.versions.reduce<ProposalWithVersions["versions"][number] | undefined>(
      (b, v) => (toNum(v.proposalValue) ?? -1) > (toNum(b?.proposalValue) ?? -1) ? v : b,
      undefined,
    );
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
      proposedValue: proposedValue(versions),
      wonValue: wonValue(versions),
      hasValue: p.versions.some((v) => v.proposalValue != null),
      likelyAcqVendor: best?.acqQuotes.find((q) => q.isSelected)?.vendor.shortName ?? null,
      likelyAcqCost: bestCosting?.acqCost || null,
      mappingCost: bestCosting?.mappingCost || null,
      margin: bestCosting?.margin ?? null,
      createdAt: p.createdAt,
    };
  });
}

export type ProposalSummary = Awaited<ReturnType<typeof loadProposalSummaries>>[number];
