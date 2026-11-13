import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { storage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.storageKey) return NextResponse.redirect(doc.externalUrl ?? "/");
  const data = await storage.read(doc.storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
