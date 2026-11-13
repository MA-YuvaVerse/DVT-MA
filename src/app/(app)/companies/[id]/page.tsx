import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listValues } from "@/lib/lookups";
import { loadProposalSummaries } from "@/lib/proposals";
import { date, money } from "@/lib/format";
import { Card, Empty, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { Notes } from "@/components/DocsNotes";
import { CompanyFields } from "../CompanyFields";
import { deleteCompany, mergeCompany, moveContact, saveContact, saveSensor, updateCompany } from "../actions";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const c = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ active: "desc" }, { firstName: "asc" }] },
      sensors: { orderBy: { name: "asc" } },
      projects: { orderBy: { number: "desc" }, take: 50 },
      acqQuotes: { orderBy: { createdAt: "desc" }, take: 30, include: { sensor: true, version: { include: { proposal: true } } } },
      mappingQuotes: { orderBy: { createdAt: "desc" }, take: 30, include: { version: { include: { proposal: true } } } },
    },
  });
  if (!c) notFound();
  const [vendorTypes, sensorTypes, proposals, otherCompanies] = await Promise.all([
    listValues("VENDOR_TYPE"), listValues("SENSOR_TYPE"), loadProposalSummaries({ companyId: id }),
    prisma.company.findMany({ where: { active: true, id: { not: id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const isVendor = c.isAcqVendor || c.isMappingVendor;

  return (
    <>
      <PageHeader
        back={{ href: "/companies", label: "Companies" }}
        title={<span>{c.name} <span className="font-normal text-slate-500">{c.shortName ? `· ${c.shortName}` : ""} · {c.code}</span></span>}
        actions={user.role === "ADMIN" ? <form action={deleteCompany.bind(null, c.id)}><Submit className="btn-danger" confirm={`Delete ${c.name}?`}>Delete</Submit></form> : undefined}
      />
      <Card title="Company" className="mb-4">
        <ActionForm action={updateCompany.bind(null, c.id)}>
          <CompanyFields c={c} vendorTypes={vendorTypes} />
          <div className="mt-3"><Submit>Save company</Submit></div>
        </ActionForm>
        {user.role === "ADMIN" && (
          <details className="mt-3 border-t border-slate-100 pt-2 text-sm">
            <summary className="cursor-pointer text-slate-500">Duplicate? Merge this company into another…</summary>
            <ActionForm action={mergeCompany.bind(null, c.id)} className="mt-2 flex flex-wrap gap-2">
              <select name="targetId" className="input max-w-sm" required defaultValue="">
                <option value="">— keep this company —</option>
                {otherCompanies.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <Submit className="btn-danger" confirm={`Move all proposals, projects, quotes and contacts of ${c.name} to the selected company and delete ${c.name}?`}>Merge</Submit>
            </ActionForm>
          </details>
        )}
      </Card>

      <Card title={`Contacts (${c.contacts.filter((x) => x.active).length} active)`} className="mb-4">
        <div className="hidden grid-cols-[1fr_1fr_1fr_1.4fr_1fr_1fr_0.5fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
          <span>First</span><span>Last</span><span>Title</span><span>Email</span><span>Phone</span><span>{isVendor ? "Location / base" : "Location"}</span><span>Active</span><span />
        </div>
        <div className="space-y-2">
          {[...c.contacts, null].map((ct) => (
            <div key={ct?.id ?? "new"} className={ct && !ct.active ? "opacity-60" : ""}>
              <ActionForm action={saveContact.bind(null, c.id, ct?.id ?? null)} resetOnSuccess={!ct}>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_1.4fr_1fr_1fr_0.5fr_auto] md:items-center">
                  <input name="firstName" className="input" placeholder="First name" required defaultValue={ct?.firstName ?? ""} />
                  <input name="lastName" className="input" placeholder="Last name" defaultValue={ct?.lastName ?? ""} />
                  <input name="title" className="input" placeholder="Title" defaultValue={ct?.title ?? ""} />
                  <input name="email" type="email" className="input" placeholder="Email" defaultValue={ct?.email ?? ""} />
                  <input name="phone" className="input" placeholder="Phone" defaultValue={ct?.phone ?? ""} />
                  <input name="location" className="input" placeholder="Location" defaultValue={ct?.location ?? ""} />
                  {ct ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={ct.active} /><span className="md:hidden">Active</span></label> : <span />}
                  <Submit className={ct ? "btn-secondary btn-sm" : "btn-primary btn-sm"} pendingText="…">{ct ? "Save" : "Add"}</Submit>
                </div>
              </ActionForm>
              {ct?.active && (
                <details className="mt-1 ml-1 text-xs">
                  <summary className="cursor-pointer text-slate-500">Moved to another company…</summary>
                  <ActionForm action={moveContact.bind(null, ct.id)} className="mt-1 grid gap-2 sm:grid-cols-5">
                    <select name="newCompanyId" className="input sm:col-span-2" required defaultValue="">
                      <option value="">— new company —</option>
                      {otherCompanies.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <input name="newTitle" className="input" placeholder="New title" />
                    <input name="newEmail" type="email" className="input" placeholder="New email" />
                    <Submit className="btn-secondary btn-sm">Move</Submit>
                  </ActionForm>
                </details>
              )}
            </div>
          ))}
        </div>
      </Card>

      {c.isAcqVendor && (
        <Card title={`Sensors / equipment (${c.sensors.length})`} className="mb-4">
          <div className="space-y-2">
            {[...c.sensors, null].map((s) => (
              <ActionForm key={s?.id ?? "new"} action={saveSensor.bind(null, c.id, s?.id ?? null)} resetOnSuccess={!s}>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.5fr_1fr_1.5fr_0.5fr_auto] md:items-center">
                  <input name="name" className="input" placeholder="Sensor, e.g. Riegl LiDAR + P1" required defaultValue={s?.name ?? ""} />
                  <select name="sensorType" className="input" defaultValue={s?.sensorType ?? ""}>
                    <option value="">— type —</option>
                    {sensorTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input name="notes" className="input" placeholder="Notes" defaultValue={s?.notes ?? ""} />
                  {s ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={s.active} />Active</label> : <span />}
                  <Submit className={s ? "btn-secondary btn-sm" : "btn-primary btn-sm"} pendingText="…">{s ? "Save" : "Add"}</Submit>
                </div>
              </ActionForm>
            ))}
          </div>
        </Card>
      )}

      {isVendor && (c.acqQuotes.length > 0 || c.mappingQuotes.length > 0) && (
        <Card title="Recent quotes from this vendor" className="mb-4" bodyClass="p-0 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Version</th><th>Kind</th><th>Detail</th><th className="text-right">Cost</th><th>Status</th><th>Selected</th><th>Date</th></tr></thead>
            <tbody>
              {c.acqQuotes.map((q) => (
                <tr key={q.id}><td><Link className="link" href={`/proposals/${q.version.proposalId}?v=${q.versionId}&tab=acq`}>{q.version.code}</Link></td><td>Acquisition</td><td>{q.sensor?.name ?? "—"}</td><td className="text-right">{money(q.cost)}</td><td><StatusBadge status={q.status} /></td><td>{q.isSelected ? "✓" : ""}</td><td>{date(q.quoteDate)}</td></tr>
              ))}
              {c.mappingQuotes.map((q) => (
                <tr key={q.id}><td><Link className="link" href={`/proposals/${q.version.proposalId}?v=${q.versionId}&tab=map`}>{q.version.code}</Link></td><td>Mapping</td><td>{q.days ? `${q.days} days` : "—"}</td><td className="text-right">{money(q.cost)}</td><td><StatusBadge status={q.status} /></td><td>{q.isSelected ? "✓" : ""}</td><td>{date(q.quoteDate)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(c.isClient || c.isProspect || proposals.length > 0) && (
        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Card title={`Proposals (${proposals.length})`} bodyClass="p-0 overflow-x-auto">
            {proposals.length === 0 ? <Empty>None yet.</Empty> : (
              <table className="table">
                <thead><tr><th>#</th><th>Project</th><th>Status</th><th className="text-right">Value</th></tr></thead>
                <tbody>{proposals.map((p) => (
                  <tr key={p.id}><td><Link className="link" href={`/proposals/${p.id}`}>{p.number}</Link></td><td className="max-w-[220px] truncate">{p.title}</td><td><StatusBadge status={p.status} /></td><td className="text-right">{money(p.pipelineValue || p.proposedValue || null)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Card>
          <Card title={`Projects (${c.projects.length})`} bodyClass="p-0 overflow-x-auto">
            {c.projects.length === 0 ? <Empty>None yet.</Empty> : (
              <table className="table">
                <thead><tr><th>#</th><th>Project</th><th>Status</th><th className="text-right">Value</th></tr></thead>
                <tbody>{c.projects.map((p) => (
                  <tr key={p.id}><td><Link className="link" href={`/projects/${p.id}`}>{p.number}</Link></td><td className="max-w-[220px] truncate">{p.name}</td><td><StatusBadge status={p.status} /></td><td className="text-right">{money(p.contractValue ?? p.billedAmount)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      <Notes target={{ companyId: c.id }} contacts={c.contacts.filter((x) => x.active).map((x) => ({ value: x.id, label: `${x.firstName} ${x.lastName}`.trim() }))} />
    </>
  );
}
