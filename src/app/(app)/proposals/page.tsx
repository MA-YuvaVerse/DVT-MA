import Link from "next/link";
import { loadProposalSummaries } from "@/lib/proposals";
import { userOptions } from "@/lib/lookups";
import { OPEN_STATUSES, VERSION_STATUSES } from "@/lib/constants";
import { date, money, num } from "@/lib/format";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import type { Prisma } from "@prisma/client";

type SP = { q?: string; status?: string; pm?: string; year?: string; sort?: string };

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where: Prisma.ProposalWhereInput = {};
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { number: { contains: q } },
      { city: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { company: { shortName: { contains: q, mode: "insensitive" } } },
      { versions: { some: { OR: [{ title: { contains: q, mode: "insensitive" } }, { code: { contains: q } }, { legacyId: { contains: q } }] } } },
    ];
  }
  if (sp.pm) where.dvtPmId = sp.pm;
  if (sp.year) where.number = { startsWith: sp.year };
  const [all, users] = await Promise.all([loadProposalSummaries(where), userOptions()]);
  const status = sp.status ?? "open";
  let rows = all.filter((r) => {
    if (status === "all") return true;
    if (status === "open") return (OPEN_STATUSES as readonly string[]).includes(r.status);
    return r.status === status;
  });
  const sort = sp.sort ?? "number";
  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "value": return (b.currentValue ?? 0) - (a.currentValue ?? 0);
      case "date": return a.requestDate.getTime() - b.requestDate.getTime();
      case "client": return a.client.localeCompare(b.client) || b.number.localeCompare(a.number);
      case "followup": return (a.followUpDate?.getTime() ?? Infinity) - (b.followUpDate?.getTime() ?? Infinity);
      default: return b.number.localeCompare(a.number);
    }
  });
  const pipeline = rows.reduce((s, r) => s + r.pipelineValue, 0);
  const weighted = rows.reduce((s, r) => s + r.weightedValue, 0);
  return (
    <>
      <PageHeader
        title="Proposals"
        subtitle={`${rows.length} shown · pipeline ${money(pipeline)} · weighted ${money(weighted)}`}
        actions={<Link href="/proposals/new" className="btn-primary">New proposal</Link>}
      />
      <div className="mb-2 flex flex-wrap gap-1.5 text-sm">
        {[
          ["Open by $", "/proposals?status=open&sort=value"],
          ["Open by date", "/proposals?status=open&sort=date"],
          ["Open by client", "/proposals?status=open&sort=client"],
          ["High probability", `/proposals?status=${encodeURIComponent("Open/HIGH")}&sort=value`],
          ["Follow-ups", "/proposals?status=open&sort=followup"],
          ["All proposals", "/proposals?status=all"],
        ].map(([label, href]) => (
          <Link key={label} href={href} className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-slate-700 hover:border-brand-500 hover:text-brand-700">{label}</Link>
        ))}
      </div>
      <form className="card mb-3 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" defaultValue={sp.q} className="input lg:col-span-2" placeholder="Search number, client, project, city…" />
        <select name="status" defaultValue={status} className="input">
          <option value="open">Open (all open statuses)</option>
          <option value="all">All statuses</option>
          {VERSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="pm" defaultValue={sp.pm ?? ""} className="input">
          <option value="">All DVT PMs</option>
          {users.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="sort" defaultValue={sort} className="input">
            <option value="number">Newest first</option>
            <option value="value">Value (high→low)</option>
            <option value="date">Request date (oldest)</option>
            <option value="client">Client</option>
            <option value="followup">Follow-up date</option>
          </select>
          <button className="btn-secondary">Apply</button>
        </div>
      </form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>No proposals match these filters.</Empty> : (
          <table className="table">
            <thead>
              <tr>
                <th>Proposal #</th><th>Client</th><th>Project</th><th>Requested</th><th className="text-right">Proposal $</th>
                <th>City / State</th><th className="text-right">Acres / mi</th><th>Client PM</th><th>DVT PM</th>
              </tr>
            </thead>
            {rows.map((r) => (
              <tbody key={r.id} className="border-b border-slate-200 [&_td]:border-0">
                <tr>
                  <td className="whitespace-nowrap"><Link className="link font-medium" href={`/proposals/${r.id}`}>{r.number}</Link>{r.opportunityType === "ADD_ON" && <span className="ml-1 text-[10px] text-slate-500">ADD-ON</span>}</td>
                  <td className="max-w-[150px] truncate" title={r.client}>{r.client}</td>
                  <td className="max-w-[220px] truncate" title={r.title}>{r.title}</td>
                  <td className="whitespace-nowrap">{date(r.requestDate)}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{money(r.currentValue)}</td>
                  <td className="max-w-[130px] truncate" title={r.location}>{r.location}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{r.linearMiles != null ? `${num(r.linearMiles, 1)} mi` : num(r.mappingAcres)}</td>
                  <td className="max-w-[140px] truncate">{r.clientPm ?? "—"}</td>
                  <td>{r.dvtPm ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={9} className="!pt-0 text-xs text-slate-600">
                    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusBadge status={r.status} />
                      <span>{r.currentCode}{r.versionCount > 1 ? ` (${r.versionCount} versions)` : ""}</span>
                      <span>Acq vendor: <b>{r.likelyAcqVendor ?? "—"}</b> {r.likelyAcqCost ? money(r.likelyAcqCost) : ""}</span>
                      <span>Mapping vendor: <b>{r.mappingVendor ?? "—"}</b> {r.mappingCost ? money(r.mappingCost) : ""}</span>
                      {r.margin != null && <span>Est. margin {money(r.margin)}</span>}
                      {r.followUpDate && <span>Follow-up <b className={r.followUpDate < new Date() && (r.status === "Open" || r.status === "Open/HIGH" || r.status === "Preparing Proposal") ? "text-red-600" : ""}>{date(r.followUpDate)}</b></span>}
                    </span>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Proposal $ = Current Proposal Value (the current version). Pipeline is held at the proposal level; version values are never added together.</p>
    </>
  );
}
