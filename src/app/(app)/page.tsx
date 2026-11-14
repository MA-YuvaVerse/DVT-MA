import Link from "next/link";
import { prisma } from "@/lib/db";
import { loadProposalSummaries } from "@/lib/proposals";
import { isOpen } from "@/lib/calc";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUSES, WON_STATUS } from "@/lib/constants";
import { date, money, pct } from "@/lib/format";
import { Card, Empty, Kpi, PageHeader, StatusBadge } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export default async function Dashboard() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const showReports = (await getSettings()).showReportsCosting === "true";
  const r = (href: string) => (showReports ? href : undefined);
  const [proposals, projects] = await Promise.all([
    loadProposalSummaries(),
    prisma.project.findMany({ where: { status: { in: ACTIVE_PROJECT_STATUSES } }, include: { company: true }, orderBy: { scheduledClientDelivery: "asc" } }),
  ]);
  const open = proposals.filter((p) => isOpen(p.status));
  const ytd = proposals.filter((p) => p.requestDate.getUTCFullYear() === year);
  const wonYtd = ytd.filter((p) => p.status === WON_STATUS);
  const decidedYtd = ytd.filter((p) => !isOpen(p.status));
  const week = new Date(today.getTime() + 7 * 86_400_000);
  const followUps = open.filter((p) => p.followUpDate && p.followUpDate <= week).sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());
  const pricing = open.filter((p) => !p.hasValue);
  const overdue = projects.filter((p) => p.scheduledClientDelivery && p.scheduledClientDelivery < today && !p.actualClientDelivery);
  const byStatus = PROJECT_STATUSES.filter((s) => ACTIVE_PROJECT_STATUSES.includes(s)).map((s) => ({ s, n: projects.filter((p) => p.status === s).length }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={<><Link href="/proposals/new" className="btn-primary">New proposal</Link></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open pipeline" value={money(open.reduce((s, p) => s + p.pipelineValue, 0))} sub={`${open.length} open proposals`} href="/proposals?status=open&sort=value" />
        <Kpi label="Weighted pipeline" value={money(open.reduce((s, p) => s + p.weightedValue, 0))} sub="value × probability" href="/proposals?status=open&sort=value" />
        <Kpi label={`Won ${year}`} value={money(wonYtd.reduce((s, p) => s + p.wonValue, 0))} sub={`${wonYtd.length} of ${ytd.length} proposals`} href={r(`/reports/hit-rate?year=${year}`)} />
        <Kpi label={`Hit rate ${year}`} value={pct(decidedYtd.length ? wonYtd.length / decidedYtd.length : null)} sub={`of ${decidedYtd.length} decided`} href={r(`/reports/hit-rate?year=${year}`)} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {byStatus.map(({ s, n }) => <Kpi key={s} label={`Projects — ${s}`} value={n} href={`/projects?status=${encodeURIComponent(s)}`} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={`Follow-ups due (${followUps.length})`} actions={<Link className="link text-xs" href="/proposals?status=open&sort=followup">All</Link>} bodyClass="p-0 overflow-x-auto">
          {followUps.length === 0 ? <Empty>No follow-ups due this week.</Empty> : (
            <table className="table">
              <thead><tr><th>Due</th><th>Proposal</th><th>Client</th><th>Project</th><th className="text-right">Value</th><th>PM</th></tr></thead>
              <tbody>{followUps.slice(0, 12).map((p) => (
                <tr key={p.id}>
                  <td className={`whitespace-nowrap ${p.followUpDate! < today ? "font-semibold text-red-600" : ""}`}>{date(p.followUpDate)}</td>
                  <td><Link className="link" href={`/proposals/${p.id}`}>{p.number}</Link></td>
                  <td>{p.client}</td><td className="max-w-[200px] truncate">{p.title}</td>
                  <td className="text-right">{money(p.pipelineValue)}</td><td>{p.dvtPm}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
        <Card title={`Projects past scheduled delivery (${overdue.length})`} actions={<Link className="link text-xs" href="/projects">All projects</Link>} bodyClass="p-0 overflow-x-auto">
          {overdue.length === 0 ? <Empty>Nothing overdue.</Empty> : (
            <table className="table">
              <thead><tr><th>Due</th><th>Project</th><th>Client</th><th>Name</th><th>Status</th></tr></thead>
              <tbody>{overdue.slice(0, 12).map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold whitespace-nowrap text-red-600">{date(p.scheduledClientDelivery)}</td>
                  <td><Link className="link" href={`/projects/${p.id}`}>{p.number}</Link></td>
                  <td>{p.company.shortName ?? p.company.name}</td><td className="max-w-[200px] truncate">{p.name}</td><td><StatusBadge status={p.status} /></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
        <Card title={`Pricing needed (${pricing.length})`} actions={<Link className="link text-xs" href="/proposals?status=open&sort=date">All</Link>} bodyClass="p-0 overflow-x-auto">
          {pricing.length === 0 ? <Empty>Every open proposal has a value.</Empty> : (
            <table className="table">
              <thead><tr><th>Requested</th><th>Proposal</th><th>Client</th><th>Project</th><th>PM</th></tr></thead>
              <tbody>{pricing.slice(0, 12).map((p) => (
                <tr key={p.id}><td className="whitespace-nowrap">{date(p.requestDate)}</td><td><Link className="link" href={`/proposals/${p.id}`}>{p.number}</Link></td><td>{p.client}</td><td className="max-w-[200px] truncate">{p.title}</td><td>{p.dvtPm}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
        <Card title="Top open proposals" actions={<Link className="link text-xs" href="/proposals?status=open&sort=value">All</Link>} bodyClass="p-0 overflow-x-auto">
          {open.length === 0 ? <Empty>No open proposals.</Empty> : (
            <table className="table">
              <thead><tr><th>Proposal</th><th>Client</th><th>Project</th><th className="text-right">Value</th></tr></thead>
              <tbody>{[...open].sort((a, b) => b.pipelineValue - a.pipelineValue).slice(0, 10).map((p) => (
                <tr key={p.id}><td><Link className="link" href={`/proposals/${p.id}`}>{p.number}</Link>{p.status === "High Probability" && <span className="ml-1 text-[10px] font-semibold text-indigo-700">HIGH</span>}</td><td>{p.client}</td><td className="max-w-[200px] truncate">{p.title}</td><td className="text-right whitespace-nowrap">{money(p.pipelineValue)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
