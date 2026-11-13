import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { findReport, toCsv } from "@/lib/reports";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const def = findReport(slug);
  if (!def) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const year = new URL(req.url).searchParams.get("year");
  const r = await def.run(year ? { year: Number(year) } : {});
  return new NextResponse(toCsv(r), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
