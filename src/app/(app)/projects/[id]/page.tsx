import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clientOptions, contactOptions, listValues, userOptions, vendorOptions } from "@/lib/lookups";
import { ACQUISITION_METHODS, PROJECT_STATUSES, US_STATES } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { dayDiff } from "@/lib/calc";
import { date, dateInput, toNum } from "@/lib/format";
import { Card, Field, Kpi, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ActionForm, CompanyContactPicker, Submit } from "@/components/client";
import { Documents, Notes } from "@/components/DocsNotes";
import { DURATIONS, MILESTONES } from "../fields";
import { changeProjectStatus, deleteProject, updateEconomics, updateMilestones, updateProjectExtra, updateProjectKey } from "../actions";

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
  const n = (x: unknown) => toNum(x) ?? "";
  const showCosting = (await getSettings()).showReportsCosting === "true";
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
        <Kpi label="Status" value={<span className="text-base">{p.status}</span>} sub={`for ${daysInStatus} days`} />
        <Kpi label="Awarded" value={date(p.awardDate)} />
        <Kpi label="Flown" value={date(p.dateFlown)} />
        <Kpi label="Client delivery" value={date(p.actualClientDelivery ?? p.scheduledClientDelivery)} sub={p.actualClientDelivery ? "delivered" : "scheduled"} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card title="Status">
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

        <Card title="Project" className="xl:col-span-2">
          <ActionForm action={updateProjectKey.bind(null, p.id)}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Project name *" className="sm:col-span-2"><input name="name" className="input" required defaultValue={p.name} /></Field>
              <CompanyContactPicker companies={clients} contacts={contacts} companyId={p.companyId} contactId={p.clientContactId} required />
              <Field label="DVT PM"><Select name="dvtPmId" options={users} value={p.dvtPmId} /></Field>
              <Field label="Acquisition method"><Select name="acquisitionMethod" options={Object.keys(ACQUISITION_METHODS)} value={p.acquisitionMethod} /></Field>
              <Field label="Client PO / job #"><input name="clientPoJob" className="input" defaultValue={p.clientPoJob ?? ""} /></Field>
              <Field label="Award date"><input type="date" name="awardDate" className="input" defaultValue={dateInput(p.awardDate)} /></Field>
              <Field label="Date flown"><input type="date" name="dateFlown" className="input" defaultValue={dateInput(p.dateFlown)} /></Field>
              <Field label="Scheduled client delivery"><input type="date" name="scheduledClientDelivery" className="input" defaultValue={dateInput(p.scheduledClientDelivery)} /></Field>
              <Field label="Actual client delivery"><input type="date" name="actualClientDelivery" className="input" defaultValue={dateInput(p.actualClientDelivery)} /></Field>
              <Field label="Project folder link" className="sm:col-span-2"><input name="folderUrl" type="url" className="input" defaultValue={p.folderUrl ?? ""} /></Field>
              <Field label="Status comments" className="sm:col-span-2 lg:col-span-4"><textarea name="comments" rows={2} className="input" defaultValue={p.comments ?? ""} /></Field>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Submit>Save project</Submit>
              {p.folderUrl && <a className="link text-sm" href={p.folderUrl} target="_blank" rel="noreferrer">Open project folder ↗</a>}
            </div>
          </ActionForm>
        </Card>
      </div>

      <details className="mb-4 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">More details — location &amp; scope, all milestone dates{showCosting ? ", economics" : ""}</summary>
        <div className="space-y-4 border-t border-slate-100 p-3">
          <Card title="Location & scope">
            <ActionForm action={updateProjectExtra.bind(null, p.id)}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="City"><input name="city" className="input" defaultValue={p.city ?? ""} /></Field>
                <Field label="State"><Select name="state" options={US_STATES} value={p.state} /></Field>
                <Field label="Latitude"><input name="latitude" className="input" inputMode="decimal" defaultValue={p.latitude ?? ""} /></Field>
                <Field label="Longitude"><input name="longitude" className="input" inputMode="decimal" defaultValue={p.longitude ?? ""} /></Field>
                <Field label="Project type"><Select name="projectType" options={projectType} value={p.projectType} /></Field>
                <Field label="Sensor type"><Select name="sensorType" options={sensorType} value={p.sensorType} /></Field>
                <Field label="Deliverables"><Select name="deliverables" options={deliverables} value={p.deliverables} /></Field>
                <Field label="PID or targets"><Select name="pidOrTargets" options={pid} value={p.pidOrTargets} /></Field>
                <Field label="Acres"><input name="acres" className="input" inputMode="decimal" defaultValue={n(p.acres)} /></Field>
                <Field label="Linear miles"><input name="linearMiles" className="input" inputMode="decimal" defaultValue={n(p.linearMiles)} /></Field>
              </div>
              <div className="mt-3"><Submit>Save details</Submit></div>
            </ActionForm>
          </Card>
          <div className="grid gap-4 xl:grid-cols-3">
        <Card title="All milestone dates" className="xl:col-span-2">
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
          {showCosting && (
        <Card title="Economics (job)">
          <ActionForm action={updateEconomics.bind(null, p.id)}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          )}
        </div>
      </details>

      <div className="grid gap-4 xl:grid-cols-2">
        <Notes target={{ projectId: p.id }} contacts={contacts.filter((c) => c.group === p.companyId)} />
        <Documents target={{ projectId: p.id }} />
      </div>
    </>
  );
}
