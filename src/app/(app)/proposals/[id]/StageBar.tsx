import Link from "next/link";
import { CLOSED_STATUSES, PIPELINE_STAGES, WON_STATUS } from "@/lib/constants";
import { Submit } from "@/components/client";
import { setVersionStatus } from "../actions";

/** Where a version is in the request → qualifying → proposal → won path, with one-click moves. */
export function StageBar({ versionId, code, status, awardHref, hasProject }: { versionId: string; code: string; status: string; awardHref: string; hasProject: boolean }) {
  const idx = (PIPELINE_STAGES as readonly string[]).indexOf(status);
  const closed = idx < 0;
  const next = !closed ? PIPELINE_STAGES[idx + 1] : undefined;
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Stage of version {code}</div>
        {closed && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Closed: {status}</span>}
      </div>
      <ol className="flex flex-wrap gap-1 text-xs">
        {PIPELINE_STAGES.map((s, i) => {
          const done = !closed && i < idx;
          const now = s === status;
          return (
            <li key={s} className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${now ? "bg-brand-600 font-semibold text-white" : done ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
              <span>{i + 1}.</span> {s === WON_STATUS ? "Won → Project" : s}
            </li>
          );
        })}
      </ol>
      {!hasProject && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {next && next !== WON_STATUS && (
            <form action={setVersionStatus.bind(null, versionId, next)}>
              <Submit className="btn-primary btn-sm" pendingText="…">Move to {next} →</Submit>
            </form>
          )}
          {(next === WON_STATUS || status === "Proposal Sent") && (
            <Link href={awardHref} className="btn-primary btn-sm">Client accepted — award &amp; create project</Link>
          )}
          {closed && (
            <form action={setVersionStatus.bind(null, versionId, "Proposal Sent")}>
              <Submit className="btn-secondary btn-sm" pendingText="…">Reopen</Submit>
            </form>
          )}
          {!closed && status !== WON_STATUS && (
            <details className="text-xs">
              <summary className="btn-secondary btn-sm cursor-pointer list-none">Close as…</summary>
              <div className="mt-1 flex flex-wrap gap-1">
                {CLOSED_STATUSES.map((c) => (
                  <form key={c} action={setVersionStatus.bind(null, versionId, c)}>
                    <Submit className="btn-secondary btn-sm" pendingText="…" confirm={`Close ${code} as ${c}?`}>{c}</Submit>
                  </form>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
