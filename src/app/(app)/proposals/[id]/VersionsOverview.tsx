import Link from "next/link";
import { isOpen, versionCosting } from "@/lib/calc";
import { WON_STATUS } from "@/lib/constants";
import { money, num, pct, toNum } from "@/lib/format";
import { plainVersion, type ProposalWithVersions } from "@/lib/proposals";
import { StatusBadge } from "@/components/ui";
import { Submit } from "@/components/client";
import { selectQuote } from "../actions";

type Version = ProposalWithVersions["versions"][number];

function decision(status: string) {
  if (status === WON_STATUS) return { label: "Accepted", cls: "border-emerald-400 bg-emerald-50/40" };
  if (isOpen(status)) return { label: "Open", cls: "border-slate-200" };
  if (status === "On Hold") return { label: "On hold", cls: "border-yellow-300" };
  return { label: "Rejected / not selected", cls: "border-slate-200 opacity-60" };
}

function scopeLine(v: Version) {
  return [
    v.projectType,
    v.sensorType,
    v.deliverables,
    v.isLinear ? `${num(v.linearMiles, 1)} mi${v.linearWidthFt ? ` × ${num(v.linearWidthFt)} ft` : ""}` : v.mappingAcres != null ? `${num(v.mappingAcres)} mapping ac` : null,
    v.flightAcres != null ? `${num(v.flightAcres)} flight ac` : null,
    v.gsdCm != null ? `GSD ${num(v.gsdCm, 1)} cm` : null,
    v.lidarPpsm != null ? `${num(v.lidarPpsm)} ppsm` : null,
    v.gcpCount != null ? `${v.gcpCount} GCPs` : null,
  ].filter(Boolean).join(" · ");
}

function QuoteList({ kind, v, href }: { kind: "acq" | "map"; v: Version; href: string }) {
  const quotes = kind === "acq" ? v.acqQuotes : v.mappingQuotes;
  const title = kind === "acq" ? "Acquisition vendors" : "Mapping vendors";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        <span>{title} ({quotes.length})</span>
        <Link href={href} className="font-normal normal-case link">edit</Link>
      </div>
      {quotes.length === 0 ? (
        <div className="text-xs text-slate-400">No quotes yet</div>
      ) : (
        <ul className="space-y-0.5">
          {[...quotes].sort((a, b) => Number(b.isSelected) - Number(a.isSelected) || (toNum(a.cost) ?? Infinity) - (toNum(b.cost) ?? Infinity)).map((q) => {
            const detail = "sensor" in q && q.sensor ? q.sensor.name : "days" in q && q.days ? `${q.days} days` : null;
            return (
              <li key={q.id} className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-xs ${q.isSelected ? "bg-emerald-100 font-semibold text-emerald-900" : q.status === "Declined" ? "text-slate-400 line-through" : "text-slate-600"}`}>
                <span className="min-w-0 truncate">
                  {q.isSelected && "✓ "}{q.vendor.shortName ?? q.vendor.name}{detail ? <span className="font-normal"> · {detail}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                  {money(q.cost)}
                  {!q.isSelected && q.status !== "Declined" && (
                    <form action={selectQuote.bind(null, kind, q.id)}>
                      <Submit className="rounded border border-slate-300 bg-white px-1 text-[10px] font-normal text-slate-600 hover:border-emerald-500 hover:text-emerald-700" pendingText="…">make final</Submit>
                    </form>
                  )}
                  {q.isSelected && <span className="rounded bg-emerald-600 px-1 text-[10px] text-white">FINAL</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** All versions side by side, with their quotes and the final proposal summary. */
export function VersionsOverview({ p, currentId, pathBase }: { p: ProposalWithVersions; currentId: string; pathBase: string }) {
  const accepted = p.versions.filter((v) => v.status === WON_STATUS);
  const acceptedCost = accepted.map((v) => versionCosting(plainVersion(v)));
  const total = acceptedCost.reduce((s, c) => s + (c.value ?? 0), 0);
  const totalCost = acceptedCost.reduce((s, c) => s + c.totalCost, 0);
  const cur = p.versions.find((v) => v.id === currentId);
  return (
    <div className="space-y-3">
      <div className={`rounded-md border p-3 text-sm ${accepted.length ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
        <div className="mb-1 font-semibold">Final proposal</div>
        {accepted.length === 0 ? (
          <p className="text-slate-600">
            Not decided yet. Current version <b>{cur?.code}</b> ({money(cur?.proposalValue)}) is what counts in the pipeline.
            When the client accepts a version, award it on its <i>Award</i> tab; versions the client did not choose are marked rejected.
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {accepted.map((v, i) => {
                const acq = v.acqQuotes.filter((q) => q.isSelected).map((q) => `${q.vendor.shortName ?? q.vendor.name} ${money(q.cost)}`).join(", ");
                const map = v.mappingQuotes.filter((q) => q.isSelected).map((q) => `${q.vendor.shortName ?? q.vendor.name} ${money(q.cost)}`).join(", ");
                return (
                  <li key={v.id}>
                    <b>{v.code}</b> {v.title} — <b>{money(v.proposalValue)}</b>
                    <div className="text-xs text-slate-600">{scopeLine(v) || "scope not entered"} · acquisition: {acq || "none selected"} · mapping: {map || "none selected"} · margin {pct(acceptedCost[i].marginPct)}</div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 border-t border-emerald-200 pt-1 font-semibold">
              Total accepted {money(total)} · costs {money(totalCost)} · margin {money(totalCost ? total - totalCost : null)} {totalCost ? `(${pct((total - totalCost) / total)})` : ""}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {p.versions.map((v) => {
          const c = versionCosting(plainVersion(v));
          const d = decision(v.status);
          const vBase = `${pathBase}?v=${v.id}`;
          return (
            <section key={v.id} className={`rounded-lg border-2 bg-white p-3 ${d.cls} ${v.id === currentId ? "ring-2 ring-brand-500" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Link className="link" href={`${vBase}&tab=scope`}>{v.code}</Link>
                    {v.id === currentId && <span className="rounded bg-brand-600 px-1 text-[10px] text-white">CURRENT</span>}
                    <span className="text-xs font-normal text-slate-500">{d.label}</span>
                  </div>
                  <div className="truncate text-sm" title={v.title}>{v.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold tabular-nums">{money(v.proposalValue)}</div>
                  <StatusBadge status={v.status} />
                </div>
              </div>
              <div className="my-2 text-xs text-slate-600">{scopeLine(v) || "Scope not entered yet"}</div>
              <div className="space-y-2">
                <QuoteList kind="acq" v={v} href={`${vBase}&tab=acq`} />
                <QuoteList kind="map" v={v} href={`${vBase}&tab=map`} />
              </div>
              <div className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-600">
                Cost {money(c.totalCost || null)} (acq {money(c.acqCost || null)} + mapping {money(c.mappingCost || null)} + internal {money(c.internalCost || null)}) ·{" "}
                <b>margin {money(c.margin)} {c.marginPct != null ? `(${pct(c.marginPct)})` : ""}</b>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
