import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import { projectMargin } from "@/lib/calc";
import { date, money, pct, toNum } from "@/lib/format";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

type SP = { q?: string; status?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = sp.status ?? "active";
  const where: Prisma.ProjectWhereInput = {};
  if (status === "active") where.status = { in: ACTIVE_PROJECT_STATUSES };
  else if (status !== "all") where.status = status;
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { company: { shortName: { contains: q, mode: "insensitive" } } },
      { clientPoJob: { contains: q, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.project.findMany({
    where,
    include: { company: true, dvtPm: true, acqVendor: true, processingVendor: true },
    orderBy: [{ scheduledClientDelivery: "asc" }, { number: "desc" }],
  });
  const groups = PROJECT_STATUSES.map((s) => ({ status: s, rows: rows.filter((r) => r.status === s) })).filter((g) => g.rows.length);
  return (
    <>
      <PageHeader title="Projects" subtitle={`${rows.length} shown`} actions={<Link href="/projects/new" className="btn-secondary">New project (no proposal)</Link>} />
      <form className="card mb-3 grid gap-2 p-3 sm:grid-cols-[2fr_1fr_auto]">
        <input name="q" defaultValue={sp.q} className="input" placeholder="Search project #, client, name, PO…" />
        <select name="status" defaultValue={status} className="input">
          <option value="active">Active (awarded → ready for invoicing)</option>
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-secondary">Apply</button>
      </form>
      {groups.length === 0 && <div className="card"><Empty>No projects match.</Empty></div>}
      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.status} className="card overflow-x-auto">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <StatusBadge status={g.status} /><span className="text-sm text-slate-500">{g.rows.length}</span>
            </div>
            <table className="table">
              <thead>
                <tr><th>Project #</th><th>Client</th><th>Project</th><th>PM</th><th>Acq vendor</th><th>Mapping sub</th><th>Flown</th><th>Sent to sub</th><th>Client due</th><th className="text-right">Value</th><th className="text-right">Margin</th><th>Comments</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => {
                  const m = projectMargin({ contractValue: toNum(r.contractValue), billedAmount: toNum(r.billedAmount), acqCost: toNum(r.acqCost), processingCost: toNum(r.processingCost), mobCosts: toNum(r.mobCosts) });
                  const late = r.scheduledClientDelivery && !r.actualClientDelivery && r.scheduledClientDelivery < new Date();
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap"><Link className="link font-medium" href={`/projects/${r.id}`}>{r.number}</Link></td>
                      <td className="whitespace-nowrap">{r.company.shortName ?? r.company.name}</td>
                      <td className="max-w-[220px] truncate" title={r.name}>{r.name}</td>
                      <td>{r.dvtPm?.initials ?? "—"}</td>
                      <td className="whitespace-nowrap">{r.acqVendor?.shortName ?? r.acqVendor?.name ?? "—"}</td>
                      <td className="whitespace-nowrap">{r.processingVendor?.shortName ?? r.processingVendor?.name ?? "—"}</td>
                      <td className="whitespace-nowrap">{date(r.dateFlown)}</td>
                      <td className="whitespace-nowrap">{date(r.sentToSub)}</td>
                      <td className={`whitespace-nowrap ${late ? "font-semibold text-red-600" : ""}`}>{date(r.scheduledClientDelivery)}</td>
                      <td className="text-right tabular-nums">{money(m.value)}</td>
                      <td className="text-right tabular-nums">{pct(m.marginPct)}</td>
                      <td className="max-w-[260px] truncate text-slate-600" title={r.comments ?? ""}>{r.comments}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}
