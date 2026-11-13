import Link from "next/link";
import { REPORTS } from "@/lib/reports";
import { PageHeader } from "@/components/ui";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Replace the QUERY and pivot tabs. They don't break when fields change, and every report exports to CSV." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.slug} href={`/reports/${r.slug}`} className="card block p-3 hover:border-brand-500">
            <div className="font-semibold">{r.title}</div>
            <div className="text-sm text-slate-500">{r.description}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
