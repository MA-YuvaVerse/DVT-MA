import "server-only";
import { prisma } from "./db";
import { loadProposalSummaries, type ProposalSummary } from "./proposals";
import { dayDiff, isOpen, projectMargin } from "./calc";
import { cityState, toNum } from "./format";
import { WON_STATUS } from "./constants";

export type ColKind = "text" | "money" | "date" | "pct" | "num";
export interface Col { key: string; label: string; kind?: ColKind }
export interface ReportResult {
  columns: Col[];
  rows: Record<string, unknown>[];
  links?: Record<string, (row: Record<string, unknown>) => string | null>;
  totals?: Record<string, unknown>;
  note?: string;
}
export interface ReportDef {
  slug: string;
  title: string;
  description: string;
  params?: ("year")[];
  run(params: { year?: number }): Promise<ReportResult>;
}

const proposalCols: Col[] = [
  { key: "number", label: "Proposal #" },
  { key: "requestDate", label: "Requested", kind: "date" },
  { key: "client", label: "Client" },
  { key: "title", label: "Project" },
  { key: "pipelineValue", label: "Value", kind: "money" },
  { key: "weightedValue", label: "Weighted", kind: "money" },
  { key: "status", label: "Status" },
  { key: "clientPm", label: "Client PM" },
  { key: "dvtPm", label: "DVT PM" },
  { key: "location", label: "Location" },
  { key: "projectType", label: "Type" },
  { key: "sensorType", label: "Sensor" },
  { key: "mappingAcres", label: "Acres", kind: "num" },
  { key: "followUpDate", label: "Follow-up", kind: "date" },
  { key: "likelyAcqVendor", label: "Likely acq vendor" },
  { key: "likelyAcqCost", label: "Acq cost", kind: "money" },
  { key: "mappingCost", label: "Mapping cost", kind: "money" },
  { key: "margin", label: "Est. margin", kind: "money" },
  { key: "comments", label: "Comments" },
];
const proposalLinks = { number: (r: Record<string, unknown>) => `/proposals/${r.id}` };
const sum = (rows: ProposalSummary[], k: "pipelineValue" | "weightedValue") => rows.reduce((s, r) => s + r[k], 0);

async function openProposals() {
  return (await loadProposalSummaries()).filter((p) => isOpen(p.status));
}

function proposalReport(rows: ProposalSummary[], note?: string): ReportResult {
  return {
    columns: proposalCols,
    rows: rows as unknown as Record<string, unknown>[],
    links: proposalLinks,
    totals: { number: `${rows.length} proposals`, pipelineValue: sum(rows, "pipelineValue"), weightedValue: sum(rows, "weightedValue") },
    note,
  };
}

function yearOf(p: ProposalSummary) {
  return p.requestDate.getUTCFullYear();
}

export const REPORTS: ReportDef[] = [
  {
    slug: "open-by-value",
    title: "Open proposals by $",
    description: "All open proposals, highest pipeline value first.",
    async run() {
      const rows = (await openProposals()).sort((a, b) => b.pipelineValue - a.pipelineValue);
      return proposalReport(rows, "Each proposal counted once; versions are never added together.");
    },
  },
  {
    slug: "open-by-date",
    title: "Open proposals by date",
    description: "Open proposals, oldest request first — what has been waiting longest.",
    async run() {
      return proposalReport((await openProposals()).sort((a, b) => a.requestDate.getTime() - b.requestDate.getTime()));
    },
  },
  {
    slug: "open-by-client",
    title: "Open proposals by client",
    description: "Open proposals grouped by client.",
    async run() {
      return proposalReport((await openProposals()).sort((a, b) => a.client.localeCompare(b.client) || b.pipelineValue - a.pipelineValue));
    },
  },
  {
    slug: "high-probability",
    title: "High probability",
    description: "Proposals marked Open/HIGH.",
    async run() {
      return proposalReport((await openProposals()).filter((p) => p.status === "Open/HIGH").sort((a, b) => b.pipelineValue - a.pipelineValue));
    },
  },
  {
    slug: "follow-ups",
    title: "Follow-ups due",
    description: "Open proposals with a follow-up date in the next 7 days or overdue.",
    async run() {
      const limit = new Date(Date.now() + 7 * 86_400_000);
      const rows = (await openProposals()).filter((p) => p.followUpDate && p.followUpDate <= limit).sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());
      return proposalReport(rows);
    },
  },
  {
    slug: "pricing-needed",
    title: "Pricing needed",
    description: "Open proposals that do not have a proposal value yet.",
    async run() {
      return proposalReport((await openProposals()).filter((p) => !p.hasValue).sort((a, b) => a.requestDate.getTime() - b.requestDate.getTime()));
    },
  },
  {
    slug: "hit-rate",
    title: "Hit rate & metrics",
    description: "Proposals, wins and hit rate by month for a year. Each proposal counts once, however many versions it has.",
    params: ["year"],
    async run({ year }) {
      const y = year ?? new Date().getUTCFullYear();
      const all = (await loadProposalSummaries()).filter((p) => yearOf(p) === y);
      const months = Array.from({ length: 12 }, (_, m) => m);
      const row = (label: string, rows: ProposalSummary[]) => {
        const won = rows.filter((r) => r.status === WON_STATUS);
        const closed = rows.filter((r) => !isOpen(r.status));
        const proposed = rows.reduce((s, r) => s + r.proposedValue, 0);
        const wonVal = won.reduce((s, r) => s + r.wonValue, 0);
        const open = rows.filter((r) => isOpen(r.status));
        return {
          period: label,
          proposals: rows.length,
          proposedValue: proposed,
          won: won.length,
          wonValue: wonVal,
          hitRateCount: closed.length ? won.length / closed.length : null,
          hitRateValue: proposed ? wonVal / proposed : null,
          open: open.length,
          openValue: open.reduce((s, r) => s + r.pipelineValue, 0),
        };
      };
      const rows = months.map((m) => row(new Date(Date.UTC(y, m, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" }), all.filter((p) => p.requestDate.getUTCMonth() === m)));
      const byClient = Object.entries(Object.groupBy(all, (p) => p.client)).map(([c, rs]) => row(c, rs ?? [])).sort((a, b) => b.proposedValue - a.proposedValue);
      return {
        columns: [
          { key: "period", label: "Period / client" },
          { key: "proposals", label: "# Proposals", kind: "num" },
          { key: "proposedValue", label: "$ Proposed", kind: "money" },
          { key: "won", label: "# Won", kind: "num" },
          { key: "wonValue", label: "$ Won", kind: "money" },
          { key: "hitRateCount", label: "Hit rate (#, of decided)", kind: "pct" },
          { key: "hitRateValue", label: "Hit rate ($)", kind: "pct" },
          { key: "open", label: "# Open", kind: "num" },
          { key: "openValue", label: "$ Open pipeline", kind: "money" },
        ],
        rows: [...rows, { period: "— By client —" }, ...byClient],
        totals: row(`Total ${y}`, all),
        note: "Hit rate (#) = won ÷ proposals no longer open. $ proposed uses the highest version of each proposal.",
      };
    },
  },
  {
    slug: "project-throughput",
    title: "Project throughput",
    description: "Days between key milestones for each project, plus margin.",
    async run() {
      const ps = await prisma.project.findMany({ include: { company: true, acqVendor: true, processingVendor: true }, orderBy: { number: "desc" } });
      const rows = ps.map((p) => {
        const m = projectMargin({ contractValue: toNum(p.contractValue), billedAmount: toNum(p.billedAmount), acqCost: toNum(p.acqCost), processingCost: toNum(p.processingCost), mobCosts: toNum(p.mobCosts) });
        return {
          id: p.id, number: p.number, client: p.company.shortName ?? p.company.name, name: p.name, status: p.status,
          location: cityState(p.city, p.state),
          acqVendor: p.acqVendor?.shortName ?? p.acqVendor?.name ?? null, processingVendor: p.processingVendor?.shortName ?? p.processingVendor?.name ?? null,
          awardToFlown: dayDiff(p.awardDate, p.dateFlown),
          flownToImagery: dayDiff(p.dateFlown, p.imageryIn),
          sentToSubToMapping: dayDiff(p.sentToSub, p.mappingIn),
          subLateDays: dayDiff(p.subDeliveryPromised, p.mappingIn),
          awardToDelivery: dayDiff(p.awardDate, p.actualClientDelivery),
          deliveryToPayment: dayDiff(p.actualClientDelivery, p.paymentDate),
          value: m.value, margin: m.margin, marginPct: m.marginPct,
        };
      });
      const avg = (k: keyof (typeof rows)[number]) => {
        const xs = rows.map((r) => r[k]).filter((x): x is number => typeof x === "number");
        return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
      };
      return {
        columns: [
          { key: "number", label: "Project #" }, { key: "client", label: "Client" }, { key: "name", label: "Project" }, { key: "status", label: "Status" },
          { key: "acqVendor", label: "Acq vendor" }, { key: "processingVendor", label: "Mapping sub" },
          { key: "awardToFlown", label: "Award→flown", kind: "num" }, { key: "flownToImagery", label: "Flown→imagery", kind: "num" },
          { key: "sentToSubToMapping", label: "Sub turnaround", kind: "num" }, { key: "subLateDays", label: "Sub late (days)", kind: "num" },
          { key: "awardToDelivery", label: "Award→delivery", kind: "num" }, { key: "deliveryToPayment", label: "Delivery→paid", kind: "num" },
          { key: "value", label: "Value", kind: "money" }, { key: "margin", label: "Margin", kind: "money" }, { key: "marginPct", label: "Margin %", kind: "pct" },
        ],
        rows,
        links: { number: (r) => `/projects/${r.id}` },
        totals: {
          number: "Average", awardToFlown: avg("awardToFlown"), flownToImagery: avg("flownToImagery"), sentToSubToMapping: avg("sentToSubToMapping"),
          subLateDays: avg("subLateDays"), awardToDelivery: avg("awardToDelivery"), deliveryToPayment: avg("deliveryToPayment"),
        },
      };
    },
  },
  {
    slug: "vendor-quotes",
    title: "Vendor quote history",
    description: "How often each vendor is asked, how often selected, and their typical price.",
    async run() {
      const [acq, map] = await Promise.all([
        prisma.acquisitionQuote.findMany({ include: { vendor: true } }),
        prisma.mappingQuote.findMany({ include: { vendor: true } }),
      ]);
      const agg = new Map<string, { vendor: string; kind: string; quotes: number; selected: number; costs: number[]; vendorId: string }>();
      for (const [kind, list] of [["Acquisition", acq], ["Mapping", map]] as const) {
        for (const q of list) {
          const k = `${kind}:${q.vendorId}`;
          const a = agg.get(k) ?? { vendor: q.vendor.shortName ?? q.vendor.name, kind, quotes: 0, selected: 0, costs: [], vendorId: q.vendorId };
          a.quotes++;
          if (q.isSelected) a.selected++;
          const c = toNum(q.cost);
          if (c != null) a.costs.push(c);
          agg.set(k, a);
        }
      }
      const rows = [...agg.values()].map((a) => ({
        id: a.vendorId, vendor: a.vendor, kind: a.kind, quotes: a.quotes, selected: a.selected,
        selectRate: a.quotes ? a.selected / a.quotes : null,
        avgCost: a.costs.length ? a.costs.reduce((x, y) => x + y, 0) / a.costs.length : null,
        minCost: a.costs.length ? Math.min(...a.costs) : null, maxCost: a.costs.length ? Math.max(...a.costs) : null,
      })).sort((a, b) => a.kind.localeCompare(b.kind) || b.quotes - a.quotes);
      return {
        columns: [
          { key: "vendor", label: "Vendor" }, { key: "kind", label: "Kind" }, { key: "quotes", label: "# Quotes", kind: "num" },
          { key: "selected", label: "# Selected", kind: "num" }, { key: "selectRate", label: "Selected %", kind: "pct" },
          { key: "avgCost", label: "Avg quote", kind: "money" }, { key: "minCost", label: "Min", kind: "money" }, { key: "maxCost", label: "Max", kind: "money" },
        ],
        rows,
        links: { vendor: (r) => `/companies/${r.id}` },
      };
    },
  },
];

export function findReport(slug: string) {
  return REPORTS.find((r) => r.slug === slug);
}

export function toCsv(r: ReportResult) {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [r.columns.map((c) => esc(c.label)).join(",")];
  for (const row of r.rows) lines.push(r.columns.map((c) => esc(row[c.key])).join(","));
  if (r.totals) lines.push(r.columns.map((c) => esc(r.totals![c.key])).join(","));
  return lines.join("\n");
}
