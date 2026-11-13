import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clientOptions, contactOptions, listValues, userOptions, vendorOptions } from "@/lib/lookups";
import { PROJECT_STATUSES } from "@/lib/constants";
import { dayDiff, projectMargin } from "@/lib/calc";
import { date, dateInput, money, pct, toNum } from "@/lib/format";
import { Card, Field, Kpi, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { Documents, Notes } from "@/components/DocsNotes";
import { ProjectDetailFields } from "../ProjectDetailFields";
import { DURATIONS, MILESTONES } from "../fields";
import { changeProjectStatus, deleteProject, updateEconomics, updateMilestones, updateProjectDetails } from "../actions";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      company: true, dvtPm: true, proposal: true, version: true, parentProject: true,
      addOns: { orderBy: { number: "asc" } },
      addOnProposals: { include: { versions: true } },
      statusHistory: { orderBy: { changedAt: "desc" }, include: { user: true } },
    },
  });
  if (!p) notFound();
  const [clients, contacts, users, acqVendors, mapVendors, projectType, sensorType, deliverables, pid] = await Promise.all([
    clientOptions(), contactOptions(), userOptions(), vendorOptions("acq"), vendorOptions("mapping"),
    listValues("PROJECT_TYPE"), listValues("SENSOR_TYPE"), listValues("DELIVERABLE"), listValues("PID_TARGETS"),
  ]);
  const m = projectMargin({ contractValue: toNum(p.contractValue), billedAmount: toNum(p.billedAmount), acqCost: toNum(p.acqCost), processingCost: toNum(p.processingCost), mobCosts: toNum(p.mobCosts) });
  const n = (x: unknown) => toNum(x) ?? "";
  const daysInStatus = dayDiff(p.statusChangedAt, new Date());

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        title={<span>{p.number} <span className="font-normal text-slate-500">· {p.company.shortName ?? p.company.name} · {p.name}</span></span>}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} /><span className="text-xs">for {daysInStatus} days</span>
            {p.proposal && <span>from proposal <Link className="link" href={`/proposals/${p.proposal.id}${p.versionId ? `?v=${p.versionId}` : ""}`}>{p.version?.code ?? p.proposal.number}</Link></span>}
            {p.parentProject && <span>add-on to <Link className="link" href={`/projects/${p.parentProject.id}`}>{p.parentProject.number}</Link></span>}
          </span>
        }
        actions={
          <>
            <Link className="btn-secondary" href={`/proposals/new?parent=${p.id}`}>New add-on proposal</Link>
            {user.role === "ADMIN" && (
              <form action={deleteProject.bind(null, p.id)}><Submit className="btn-danger" confirm={`Delete project ${p.number}?`}>Delete</Submit></form>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Project value" value={money(m.value)} sub={p.billedAmount != null ? `billed ${money(p.billedAmount)}` : undefined} />
        <Kpi label="Costs" value={money(m.cost)} sub="acquisition + processing + mob" />
        <Kpi label="Contribution margin" value={money(m.margin)} sub={pct(m.marginPct)} />
        <Kpi label="Client delivery" value={date(p.actualClientDelivery ?? p.scheduledClientDelivery)} sub={p.actualClientDelivery ? "delivered" : "scheduled"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Status" className="xl:col-span-1">
          <ActionForm action={changeProjectStatus.bind(null, p.id)} className="flex gap-2">
            <Select name="status" options={PROJECT_STATUSES as unknown as string[]} value={p.status} />
            <Submit>Move</Submit>
          </ActionForm>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {p.statusHistory.map((h) => (
              <li key={h.id}>{date(h.changedAt)} · {h.fromStatus ? `${h.fromStatus} → ` : ""}<b>{h.toStatus}</b>{h.user ? ` · ${h.user.initials}` : ""}</li>
            ))}
          </ul>
          {(p.addOns.length > 0 || p.addOnProposals.length > 0) && (
            <div className="mt-3 border-t border-slate-100 pt-2 text-sm">
              <div className="label">Add-on work</div>
              {p.addOns.map((a) => <div key={a.id}><Link className="link" href={`/projects/${a.id}`}>{a.number}</Link> {a.name} <StatusBadge status={a.status} /></div>)}
              {p.addOnProposals.map((a) => <div key={a.id}>Proposal <Link className="link" href={`/proposals/${a.id}`}>{a.number}</Link> {a.versions[0]?.title}</div>)}
            </div>
          )}
        </Card>

        <Card title="Economics (job)" className="xl:col-span-2">
          <ActionForm action={updateEconomics.bind(null, p.id)}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Client PO / job #"><input name="clientPoJob" className="input" defaultValue={p.clientPoJob ?? ""} /></Field>
              <Field label="DVT invoice #(s)"><input name="invoiceNumbers" className="input" defaultValue={p.invoiceNumbers ?? ""} /></Field>
              <Field label="Project value — to be billed"><input name="contractValue" className="input" inputMode="decimal" defaultValue={n(p.contractValue)} /></Field>
              <Field label="Billed amount"><input name="billedAmount" className="input" inputMode="decimal" defaultValue={n(p.billedAmount)} /></Field>
              <Field label="Acquisition vendor"><Select name="acqVendorId" options={acqVendors} value={p.acqVendorId} /></Field>
              <Field label="Acquisition cost"><input name="acqCost" className="input" inputMode="decimal" defaultValue={n(p.acqCost)} /></Field>
              <Field label="Processing vendor"><Select name="processingVendorId" options={mapVendors} value={p.processingVendorId} /></Field>
              <Field label="Processing cost"><input name="processingCost" className="input" inputMode="decimal" defaultValue={n(p.processingCost)} /></Field>
              <Field label="DVT mob costs"><input name="mobCosts" className="input" inputMode="decimal" defaultValue={n(p.mobCosts)} /></Field>
              <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" name="invoicePaid" defaultChecked={p.invoicePaid} /> Invoice paid</label>
            </div>
            <div className="mt-3"><Submit>Save economics</Submit></div>
          </ActionForm>
        </Card>
      </div>

      <Card title="Project details" className="my-4">
        <ActionForm action={updateProjectDetails.bind(null, p.id)}>
          <ProjectDetailFields p={p} clients={clients} contacts={contacts} users={users} lists={{ projectType, sensorType, deliverables, pid }} />
          <div className="mt-3 flex items-center gap-3">
            <Submit>Save details</Submit>
            {p.folderUrl && <a className="link text-sm" href={p.folderUrl} target="_blank" rel="noreferrer">Open project folder ↗</a>}
          </div>
        </ActionForm>
      </Card>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card title="Milestones" className="xl:col-span-2">
          <ActionForm action={updateMilestones.bind(null, p.id)}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MILESTONES.map(([k, label]) => (
                <Field key={k} label={label}><input type="date" name={k} className="input" defaultValue={dateInput(p[k])} /></Field>
              ))}
            </div>
            <div className="mt-3"><Submit>Save milestones</Submit></div>
          </ActionForm>
        </Card>
        <Card title="Throughput (days)">
          <table className="table">
            <tbody>
              {DURATIONS.map(([label, a, b]) => {
                const d = dayDiff(p[a], p[b]);
                return <tr key={label}><td>{label}</td><td className={`text-right tabular-nums ${d != null && d < 0 ? "text-red-600" : ""}`}>{d ?? "—"}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Notes target={{ projectId: p.id }} contacts={contacts.filter((c) => c.group === p.companyId)} />
        <Documents target={{ projectId: p.id }} />
      </div>
    </>
  );
}
