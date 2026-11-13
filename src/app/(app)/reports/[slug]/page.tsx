import { notFound } from "next/navigation";
import { findReport } from "@/lib/reports";
import { Empty, PageHeader } from "@/components/ui";
import { ReportTable } from "../ReportTable";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const def = findReport(slug);
  if (!def) notFound();
  const year = sp.year ? Number(sp.year) : undefined;
  const r = await def.run({ year });
  const thisYear = new Date().getUTCFullYear();
  const csv = `/api/reports/${slug}${year ? `?year=${year}` : ""}`;
  return (
    <>
      <PageHeader
        back={{ href: "/reports", label: "Reports" }}
        title={def.title}
        subtitle={def.description}
        actions={
          <>
            {def.params?.includes("year") && (
              <form className="flex gap-2">
                <select name="year" defaultValue={String(year ?? thisYear)} className="input">
                  {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => <option key={y}>{y}</option>)}
                </select>
                <button className="btn-secondary">Show</button>
              </form>
            )}
            <a className="btn-secondary" href={csv}>Export CSV</a>
          </>
        }
      />
      <div className="card overflow-x-auto">
        {r.rows.length === 0 ? <Empty>Nothing to show.</Empty> : <ReportTable r={r} links={r.links} />}
      </div>
      {r.note && <p className="mt-2 text-xs text-slate-500">{r.note}</p>}
    </>
  );
}
