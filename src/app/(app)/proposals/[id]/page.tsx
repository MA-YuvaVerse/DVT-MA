import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { summaryInclude, plainVersion, proposalDisplayName } from "@/lib/proposals";
import { clientOptions, contactOptions, listValues, projectOptions, sensorOptions, userOptions, vendorOptions } from "@/lib/lookups";
import { proposalPipeline, proposalStatus, versionCosting, versionProbability } from "@/lib/calc";
import { getPipelineConfig } from "@/lib/settings";
import { ACQUISITION_METHODS, OPEN_STATUSES, PIPELINE_RULES } from "@/lib/constants";
import { cityState, date, money, num, pct, toNum } from "@/lib/format";
import { Card, Kpi, LinkTabs, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { ProposalHeaderFields, VersionScopeFields } from "@/components/ProposalFields";
import { Documents, Notes } from "@/components/DocsNotes";
import { AcqQuoteRow, MappingQuoteRow } from "./QuoteRows";
import {
  addVersion, awardVersion, deleteProposal, deleteVersion, updateInternalCost, updateProposal, updateVersion,
} from "../actions";

type SP = { v?: string; tab?: string };

export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireUser()]);
  const p = await prisma.proposal.findUnique({ where: { id }, include: summaryInclude });
  if (!p) notFound();

  const [cfg, clients, contacts, users, projects, acqVendors, mapVendors, sensors, projectType, sensorType, deliverables, versionProjects] = await Promise.all([
    getPipelineConfig(), clientOptions(), contactOptions(), userOptions(), projectOptions(), vendorOptions("acq"), vendorOptions("mapping"),
    sensorOptions(), listValues("PROJECT_TYPE"), listValues("SENSOR_TYPE"), listValues("DELIVERABLE"),
    prisma.project.findMany({ where: { proposalId: id }, select: { id: true, number: true, versionId: true, status: true } }),
  ]);

  const v = p.versions.find((x) => x.id === sp.v) ?? p.versions[p.versions.length - 1];
  const tab = sp.tab ?? "scope";
  const base = `/proposals/${p.id}?v=${v.id}`;
  const pipe = proposalPipeline(p.versions.map(plainVersion), cfg.rule, cfg.prob);
  const costing = versionCosting(plainVersion(v));
  const vProject = versionProjects.find((x) => x.versionId === v.id);
  const status = proposalStatus(p.versions);
  const companyContacts = contacts.filter((c) => c.group === p.companyId);
  const quoteSubject = `Quote Request - DVT #${v.code} - ${v.title}${p.city || p.state ? ` ${cityState(p.city, p.state).replace(",", "")}` : ""}`;

  return (
    <>
      <PageHeader
        back={{ href: "/proposals", label: "Proposals" }}
        title={<span>{p.number} <span className="font-normal text-slate-500">· {p.company.shortName ?? p.company.name} · {v.title}</span></span>}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {p.opportunityType === "ADD_ON" && p.parentProject && (
              <span>Add-on to <Link className="link" href={`/projects/${p.parentProject.id}`}>{p.parentProject.number}</Link></span>
            )}
            {versionProjects.map((x) => (
              <Link key={x.id} className="link" href={`/projects/${x.id}`}>Project {x.number}</Link>
            ))}
            <span className="text-xs text-slate-400">{proposalDisplayName(p)}</span>
          </span>
        }
        actions={user.role === "ADMIN" && versionProjects.length === 0 ? (
          <form action={deleteProposal.bind(null, p.id)}><Submit className="btn-danger" confirm={`Delete proposal ${p.number} and all its versions and quotes?`}>Delete proposal</Submit></form>
        ) : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pipeline value" value={money(pipe.value)} sub={`${PIPELINE_RULES[cfg.rule]} · counted once`} />
        <Kpi label="Weighted pipeline" value={money(pipe.weighted)} sub={`${pipe.probability.toFixed(0)}% probability`} />
        <Kpi label={`Version ${v.code} margin`} value={money(costing.margin)} sub={pct(costing.marginPct)} />
        <Kpi label="Versions" value={p.versions.length} sub={`${p.versions.filter((x) => (OPEN_STATUSES as readonly string[]).includes(x.status)).length} open`} />
      </div>

      <Card title="Proposal" className="mb-4">
        <ActionForm action={updateProposal.bind(null, p.id)}>
          <ProposalHeaderFields p={p} clients={clients} contacts={contacts} users={users} projects={projects.filter((x) => !versionProjects.some((vp) => vp.id === x.value))} />
          <div className="mt-3 flex items-center gap-3">
            <Submit>Save proposal</Submit>
            {p.folderUrl && <a className="link text-sm" href={p.folderUrl} target="_blank" rel="noreferrer">Open proposal folder ↗</a>}
          </div>
        </ActionForm>
      </Card>

      <Card
        className="mb-4"
        title="Versions / scope options"
        actions={
          <form action={addVersion.bind(null, p.id, v.id)} className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" name="copyQuotes" /> copy vendor quotes</label>
            <Submit className="btn-secondary btn-sm" pendingText="Adding…">+ New version from {v.code}</Submit>
          </form>
        }
        bodyClass="p-0"
      >
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-2">
          {p.versions.map((x) => {
            const c = versionCosting(plainVersion(x));
            return (
              <Link key={x.id} href={`/proposals/${p.id}?v=${x.id}&tab=${tab}`} scroll={false}
                className={`min-w-[150px] rounded-md border px-2.5 py-1.5 text-left text-xs ${x.id === v.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">.{x.versionNo}</span><StatusBadge status={x.status} /></div>
                <div className="truncate text-slate-700" title={x.title}>{x.title}</div>
                <div className="text-slate-500 tabular-nums">{money(c.value)} · margin {pct(c.marginPct)}</div>
              </Link>
            );
          })}
        </div>
        <div className="px-3 pt-2">
          <LinkTabs
            active={tab}
            tabs={[
              { key: "scope", label: "Scope & status", href: `${base}&tab=scope` },
              { key: "acq", label: `Acquisition quotes (${v.acqQuotes.length})`, href: `${base}&tab=acq` },
              { key: "map", label: `Mapping quotes (${v.mappingQuotes.length})`, href: `${base}&tab=map` },
              { key: "cost", label: "Costing & margin", href: `${base}&tab=cost` },
              { key: "award", label: vProject ? `Project ${vProject.number}` : "Award", href: `${base}&tab=award` },
            ]}
          />
        </div>
        <div className="p-3">
          {tab === "scope" && (
            <ActionForm action={updateVersion.bind(null, v.id)}>
              <div className="mb-2 text-xs text-slate-500">Version <b>{v.code}</b>{v.legacyId ? ` (sheet ID ${v.legacyId})` : ""} · probability {versionProbability(plainVersion(v), cfg.prob)}% · status since {date(v.statusChangedAt)}</div>
              <VersionScopeFields v={v} lists={{ projectType, sensorType, deliverables }} statusLocked={v.status === "DVT Won" && !!vProject} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Submit>Save version {v.code}</Submit>
              </div>
            </ActionForm>
          )}

          {tab === "acq" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">One row per acquisition vendor quote — add as many as you need. Tick <b>Selected</b> on the likely vendor; only selected quotes count in costing.</p>
              <div className="hidden grid-cols-[1.2fr_1.6fr_0.8fr_0.6fr_0.9fr_0.9fr_0.5fr_1.4fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
                <span>Vendor</span><span>Sensor</span><span>Cost $</span><span>Frames</span><span>Quote date</span><span>Status</span><span>Selected</span><span>Comments</span><span />
              </div>
              {v.acqQuotes.map((q) => <AcqQuoteRow key={q.id} versionId={v.id} q={q} vendors={acqVendors} sensors={sensors} acres={toNum(v.flightAcres) ?? toNum(v.mappingAcres)} />)}
              <AcqQuoteRow versionId={v.id} vendors={acqVendors} sensors={sensors} acres={null} />
              {acqVendors.length === 0 && <p className="text-sm text-amber-700">No acquisition vendors yet. Add companies with type “Acquisition vendor”.</p>}
              <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs">
                <div className="mb-1 font-semibold text-slate-600">Quote request subject (copy into your email)</div>
                <code className="block break-all select-all">{quoteSubject}</code>
                <div className="mt-1 text-slate-500">Flight acres {num(v.flightAcres)} · mapping acres {num(v.mappingAcres)} · GSD {num(v.gsdCm, 1)} cm · LiDAR {num(v.lidarPpsm)} ppsm · {v.sensorType ?? "sensor TBD"}</div>
              </div>
            </div>
          )}

          {tab === "map" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Mapping / processing quotes (any number of vendors, including a DVT estimate). Tick <b>Selected</b> on the one used for costing.</p>
              <div className="hidden grid-cols-[1.4fr_0.9fr_0.6fr_0.8fr_0.9fr_0.9fr_0.5fr_1.6fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
                <span>Vendor</span><span>Cost $</span><span>Days</span><span>$ / acre</span><span>Quote date</span><span>Status</span><span>Selected</span><span>Comments</span><span />
              </div>
              {v.mappingQuotes.map((q) => <MappingQuoteRow key={q.id} versionId={v.id} q={q} vendors={mapVendors} acres={toNum(v.mappingAcres)} />)}
              <MappingQuoteRow versionId={v.id} vendors={mapVendors} acres={toNum(v.mappingAcres)} />
              <MappingComparison quotes={v.mappingQuotes.map((q) => ({ vendor: q.vendor.shortName ?? q.vendor.name, cost: toNum(q.cost) }))} />
            </div>
          )}

          {tab === "cost" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <table className="table">
                <tbody>
                  <tr><td>Proposal value (quoted to client)</td><td className="text-right tabular-nums">{money(costing.value)}</td></tr>
                  <tr><td>Acquisition cost <span className="text-xs text-slate-500">({v.acqQuotes.filter((q) => q.isSelected).map((q) => q.vendor.shortName ?? q.vendor.name).join(", ") || "none selected"})</span></td><td className="text-right tabular-nums">{money(costing.acqCost)}</td></tr>
                  <tr><td>Mapping cost <span className="text-xs text-slate-500">({v.mappingQuotes.filter((q) => q.isSelected).map((q) => q.vendor.shortName ?? q.vendor.name).join(", ") || "none selected"})</span></td><td className="text-right tabular-nums">{money(costing.mappingCost)}</td></tr>
                  <tr><td>DVT internal / mob costs</td><td className="text-right tabular-nums">{money(costing.internalCost)}</td></tr>
                  <tr className="font-semibold"><td>Total cost</td><td className="text-right tabular-nums">{money(costing.totalCost)}</td></tr>
                  <tr className="font-semibold"><td>Estimated contribution margin</td><td className="text-right tabular-nums">{money(costing.margin)} <span className="text-slate-500">({pct(costing.marginPct)})</span></td></tr>
                  <tr><td>Acquisition cost % of proposal</td><td className="text-right">{pct(costing.acqPctOfValue)}</td></tr>
                  <tr><td>Mapping cost % of proposal</td><td className="text-right">{pct(costing.mappingPctOfValue)}</td></tr>
                  <tr><td>Proposal $ / mapping acre</td><td className="text-right">{money(costing.pricePerAcre, true)}</td></tr>
                  {v.isLinear && <tr><td>Proposal $ / mile</td><td className="text-right">{money(costing.pricePerMile, true)}</td></tr>}
                  <tr><td>Acquisition $ / flight acre</td><td className="text-right">{money(costing.acqCostPerAcre, true)}</td></tr>
                </tbody>
              </table>
              <div>
                <ActionForm action={updateInternalCost.bind(null, v.id)} className="card p-3">
                  <label className="label">DVT internal / mob costs ($)</label>
                  <div className="flex gap-2">
                    <input name="internalCost" className="input" inputMode="decimal" defaultValue={toNum(v.internalCost) ?? ""} />
                    <Submit>Save</Submit>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">The proposal value is entered on the Scope tab and is never forced to cost-plus. Margin is calculated from it.</p>
                </ActionForm>
              </div>
            </div>
          )}

          {tab === "award" && (
            vProject ? (
              <div className="text-sm">
                This version was awarded. Project <Link className="link font-semibold" href={`/projects/${vProject.id}`}>{vProject.number}</Link> — <StatusBadge status={vProject.status} />
              </div>
            ) : v.status === "DVT Won" ? (
              <p className="text-sm">Marked won (imported) with no project linked.</p>
            ) : (
              <ActionForm action={awardVersion.bind(null, v.id)} className="grid max-w-3xl gap-3 sm:grid-cols-3">
                <p className="text-sm text-slate-600 sm:col-span-3">
                  Marks <b>{v.code}</b> as <b>DVT Won</b> and creates the project{p.opportunityType === "ADD_ON" && p.parentProject ? <> as add-on <b>{p.parentProject.number}-n</b></> : <> with the next number (YYMM{cfg.settings.projectNumberInfix}## + method)</>}. Client, scope, selected vendors and costs are copied — nothing is re-keyed.
                </p>
                <div>
                  <label className="label">Acquisition method *</label>
                  <select name="acquisitionMethod" className="input" required defaultValue="Plane">
                    {Object.entries(ACQUISITION_METHODS).map(([k, s]) => <option key={k} value={k}>{k} ({s})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Award date</label>
                  <input type="date" name="awardDate" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="label">Other open versions become</label>
                  <select name="othersTo" className="input" defaultValue="Cancelled">
                    <option value="">Leave unchanged (client may award more)</option>
                    <option>Cancelled</option>
                    <option>Abandoned</option>
                    <option>Client Won/DVT Lost</option>
                  </select>
                </div>
                <div className="sm:col-span-3"><Submit pendingText="Creating project…">Award {v.code} &amp; create project</Submit></div>
              </ActionForm>
            )
          )}
        </div>
        {user.role === "ADMIN" && p.versions.length > 1 && !vProject && (
          <div className="border-t border-slate-100 px-3 py-2 text-right">
            <form action={deleteVersion.bind(null, v.id)}><Submit className="btn-danger btn-sm" confirm={`Delete version ${v.code} and its quotes?`}>Delete version {v.code}</Submit></form>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Notes target={{ proposalId: p.id }} contacts={companyContacts} />
        <Documents target={{ proposalId: p.id }} />
      </div>
    </>
  );
}

function MappingComparison({ quotes }: { quotes: { vendor: string; cost: number | null }[] }) {
  const priced = quotes.filter((q) => q.cost != null) as { vendor: string; cost: number }[];
  if (priced.length < 2) return null;
  const low = priced.reduce((a, b) => (b.cost < a.cost ? b : a));
  return (
    <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs">
      <div className="mb-1 font-semibold text-slate-600">Comparison vs lowest ({low.vendor} {money(low.cost)})</div>
      {priced.filter((q) => q !== low).map((q) => (
        <div key={q.vendor}>{q.vendor}: {money(q.cost - low.cost)} more ({pct((q.cost - low.cost) / low.cost)})</div>
      ))}
    </div>
  );
}
