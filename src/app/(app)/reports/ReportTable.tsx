import Link from "next/link";
import type { Col, ReportResult } from "@/lib/reports";
import { date, money, num, pct } from "@/lib/format";
import { StatusBadge } from "@/components/ui";

function cell(c: Col, v: unknown) {
  if (v == null || v === "") return "—";
  switch (c.kind) {
    case "money": return money(v);
    case "date": return date(v as Date);
    case "pct": return pct(v as number);
    case "num": return num(v);
    default:
      if (c.key === "status") return <StatusBadge status={String(v)} />;
      return String(v);
  }
}

export function ReportTable({ r, links }: { r: ReportResult; links?: ReportResult["links"] }) {
  const right = (c: Col) => (c.kind && c.kind !== "text" && c.kind !== "date" ? "text-right tabular-nums" : "");
  return (
    <table className="table">
      <thead><tr>{r.columns.map((c) => <th key={c.key} className={right(c)}>{c.label}</th>)}</tr></thead>
      <tbody>
        {r.rows.map((row, i) => (
          <tr key={i}>
            {r.columns.map((c) => {
              const href = links?.[c.key]?.(row);
              const content = cell(c, row[c.key]);
              return (
                <td key={c.key} className={`${right(c)} ${c.key === "comments" || c.key === "title" ? "max-w-[260px] truncate" : "whitespace-nowrap"}`} title={c.key === "comments" ? String(row[c.key] ?? "") : undefined}>
                  {href ? <Link className="link" href={href}>{content}</Link> : content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      {r.totals && (
        <tfoot>
          <tr className="font-semibold">{r.columns.map((c) => <td key={c.key} className={`${right(c)} border-t border-slate-300 px-2 py-1.5 whitespace-nowrap`}>{r.totals![c.key] == null ? "" : cell(c, r.totals![c.key])}</td>)}</tr>
        </tfoot>
      )}
    </table>
  );
}
