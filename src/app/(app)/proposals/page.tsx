import Link from "next/link";
import { loadProposalSummaries } from "@/lib/proposals";
import { userOptions } from "@/lib/lookups";
import { OPEN_STATUSES, VERSION_STATUSES } from "@/lib/constants";
import { date, money } from "@/lib/format";
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
      case "value": return b.pipelineValue - a.pipelineValue || b.proposedValue - a.proposedValue;
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
                <th>Proposal #</th><th>Client</th><th>Project</th><th>Location</th><th>Requested</th>
                <th className="text-right">Value</th><th>Status</th><th>Ver.</th><th>PM</th><th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap"><Link className="link font-medium" href={`/proposals/${r.id}`}>{r.number}</Link>{r.opportunityType === "ADD_ON" && <span className="ml-1 text-[10px] text-slate-500">ADD-ON</span>}</td>
                  <td className="whitespace-nowrap">{r.client}</td>
                  <td className="max-w-[260px] truncate" title={r.title}>{r.title}</td>
                  <td className="whitespace-nowrap">{r.location}</td>
                  <td className="whitespace-nowrap">{date(r.requestDate)}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{money(r.pipelineValue || r.proposedValue || null)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-center">{r.versionCount}</td>
                  <td>{r.dvtPm ?? "—"}</td>
                  <td className="whitespace-nowrap">{date(r.followUpDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Value = pipeline value of open versions (one value per proposal, never summed across versions); proposed value for closed proposals.</p>
    </>
  );
}
