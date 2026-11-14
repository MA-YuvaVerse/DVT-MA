import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { currentVersionNo, summaryInclude, plainVersion, proposalDisplayName } from "@/lib/proposals";
import { clientOptions, contactOptions, listValues, projectOptions, sensorOptions, userOptions, vendorOptions } from "@/lib/lookups";
import { proposalPipeline, proposalStatus, versionCosting, versionProbability } from "@/lib/calc";
import { getPipelineConfig } from "@/lib/settings";
import { ACQUISITION_METHODS, PIPELINE_RULES } from "@/lib/constants";
import { cityState, date, money, num, pct, toNum } from "@/lib/format";
import { Card, Kpi, LinkTabs, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { ProposalHeaderFields, VersionScopeFields } from "@/components/ProposalFields";
import { Documents, Notes } from "@/components/DocsNotes";
import { AcqQuoteRow, MappingQuoteRow } from "./QuoteRows";
import { VersionsOverview } from "./VersionsOverview";
import {
  addVersion, awardVersion, deleteProposal, deleteVersion, setCurrentVersion, updateInternalCost, updateProposal, updateVersion,
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

  const curNo = currentVersionNo(p);
  const cur = p.versions.find((x) => x.versionNo === curNo) ?? p.versions[p.versions.length - 1];
  const v = p.versions.find((x) => x.id === sp.v) ?? cur;
  const tab = sp.tab ?? "overview";
  const base = `/proposals/${p.id}?v=${v.id}`;
  const pipe = proposalPipeline(p.versions.map(plainVersion), cfg.rule, cfg.prob, new Date(), curNo);
  const nextFollowUp = p.versions.map((x) => x.followUpDate).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0];
  const requested = p.versions.map((x) => x.requestDate).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0];
  const clientPm = p.clientContact ? `${p.clientContact.firstName} ${p.clientContact.lastName}`.trim() : null;
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
            <span className="w-full text-xs text-slate-600">
              Requested {date(requested)} · {money(cur.proposalValue)} · {cityState(p.city, p.state) || "no location"} ·{" "}
              {cur.isLinear ? `${num(cur.linearMiles, 1)} mi` : `${num(cur.mappingAcres)} ac`} · Client PM {clientPm ?? "—"} · DVT PM {p.dvtPm?.initials ?? "—"}
            </span>
          </span>
        }
        actions={user.role === "ADMIN" && versionProjects.length === 0 ? (
          <form action={deleteProposal.bind(null, p.id)}><Submit className="btn-danger" confirm={`Delete proposal ${p.number} and all its versions and quotes?`}>Delete proposal</Submit></form>
        ) : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`Current proposal value (${cur.code})`} value={money(cur.proposalValue)} sub={`pipeline ${money(pipe.value)} · ${PIPELINE_RULES[cfg.rule].replace(" (recommended)", "").toLowerCase()}`} />
        <Kpi label="Weighted pipeline" value={money(pipe.weighted)} sub={`${pipe.probability.toFixed(0)}% probability`} />
        <Kpi label={`Version ${v.code} margin`} value={money(costing.margin)} sub={pct(costing.marginPct)} />
        <Kpi label="Next follow-up" value={date(nextFollowUp)} sub={`${p.versions.length} version${p.versions.length > 1 ? "s" : ""}`} />
      </div>

      <nav className="sticky top-0 z-10 -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-white/95 p-1 text-sm backdrop-blur">
        {[
          ["Proposal", "#proposal"],
          ["Compare versions", `${base}&tab=overview#versions`],
          ["Project specs", `${base}&tab=scope#versions`],
          ["Acquisition vendors", `${base}&tab=acq#versions`],
          ["Mapping vendors", `${base}&tab=map#versions`],
          ["Costing", `${base}&tab=cost#versions`],
          ["Notes", "#notes"],
          ["Docs", "#docs"],
        ].map(([label, href]) => (
          <a key={label} href={href} className="rounded px-2.5 py-1 whitespace-nowrap text-slate-700 hover:bg-brand-50 hover:text-brand-700">{label}</a>
        ))}
      </nav>

      <div id="proposal" className="scroll-mt-14" /><Card title="Proposal" className="mb-4">
        <ActionForm action={updateProposal.bind(null, p.id)}>
          <ProposalHeaderFields p={p} clients={clients} contacts={contacts} users={users} projects={projects.filter((x) => !versionProjects.some((vp) => vp.id === x.value))} />
          <div className="mt-3 flex items-center gap-3">
            <Submit>Save proposal</Submit>
            {p.folderUrl && <a className="link text-sm" href={p.folderUrl} target="_blank" rel="noreferrer">Open proposal folder ↗</a>}
          </div>
        </ActionForm>
      </Card>

      <div id="versions" className="scroll-mt-14" />
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
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">.{x.versionNo}{x.id === cur.id && <span className="ml-1 rounded bg-brand-600 px-1 text-[10px] text-white">CURRENT</span>}</span><StatusBadge status={x.status} /></div>
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
              { key: "overview", label: `Compare versions (${p.versions.length})`, href: `${base}&tab=overview` },
              { key: "scope", label: `.${v.versionNo} Scope & status`, href: `${base}&tab=scope` },
              { key: "acq", label: `.${v.versionNo} Acquisition quotes (${v.acqQuotes.length})`, href: `${base}&tab=acq` },
              { key: "map", label: `.${v.versionNo} Mapping quotes (${v.mappingQuotes.length})`, href: `${base}&tab=map` },
              { key: "cost", label: `.${v.versionNo} Costing & margin`, href: `${base}&tab=cost` },
              { key: "award", label: vProject ? `Project ${vProject.number}` : "Award", href: `${base}&tab=award` },
            ]}
          />
        </div>
        <div className="p-3">
          {tab !== "overview" && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm">
              <span>Editing version <b>{v.code}</b> — {v.title}</span>
              <StatusBadge status={v.status} />
              {v.id === cur.id && <span className="rounded bg-brand-600 px-1 text-[10px] text-white">CURRENT</span>}
              <span className="text-slate-600">· {money(v.proposalValue)}</span>
              <span className="ml-auto text-xs text-slate-500">Switch version using the cards above</span>
            </div>
          )}
          {tab === "overview" && <VersionsOverview p={p} currentId={cur.id} pathBase={`/proposals/${p.id}`} />}
          {tab === "scope" && (
            <ActionForm action={updateVersion.bind(null, v.id)}>
              <div className="mb-2 text-xs text-slate-500">Version <b>{v.code}</b>{v.legacyId ? ` (sheet ID ${v.legacyId})` : ""} · probability {versionProbability(plainVersion(v), cfg.prob)}% · status since {date(v.statusChangedAt)}</div>
              <VersionScopeFields v={v} lists={{ projectType, sensorType, deliverables }} statusLocked={v.status === "DVT Won" && !!vProject} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Submit>Save version {v.code}</Submit>
              </div>
            </ActionForm>
          )}
          {tab === "scope" && v.id !== cur.id && (
            <form action={setCurrentVersion.bind(null, v.id)} className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <Submit className="btn-secondary btn-sm" pendingText="…">Make {v.code} the current version</Submit>
              <span>The current version sets the Current Proposal Value and the pipeline.</span>
            </form>
          )}

          {tab === "acq" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Every acquisition vendor quoted for this version — add as many as you need. Tick <b>Final</b> on the vendor chosen for this version; only the final vendor counts in costing (ticking one unticks the others).</p>
              <div className="hidden grid-cols-[1.2fr_1.6fr_0.8fr_0.6fr_0.9fr_0.9fr_0.5fr_1.4fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
                <span>Vendor</span><span>Sensor</span><span>Cost $</span><span>Frames</span><span>Quote date</span><span>Status</span><span>Final</span><span>Comments</span><span />
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
              <p className="text-xs text-slate-500">Mapping / processing quotes (any number of vendors, including a DVT estimate). Tick <b>Final</b> on the vendor chosen for this version; only it counts in costing.</p>
              <div className="hidden grid-cols-[1.4fr_0.9fr_0.6fr_0.8fr_0.9fr_0.9fr_0.5fr_1.6fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
                <span>Vendor</span><span>Cost $</span><span>Days</span><span>$ / acre</span><span>Quote date</span><span>Status</span><span>Final</span><span>Comments</span><span />
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
        <div id="notes" className="scroll-mt-14"><Notes target={{ proposalId: p.id }} contacts={companyContacts} /></div>
        <div id="docs" className="scroll-mt-14"><Documents target={{ proposalId: p.id }} /></div>
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
