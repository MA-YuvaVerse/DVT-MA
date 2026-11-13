"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/action";
import { dateOrNull, reqStr, str } from "@/lib/form";
import { MAX_UPLOAD_BYTES, storage } from "@/lib/storage";

export type Target = { proposalId?: string; projectId?: string; companyId?: string };

function pathOf(t: Target) {
  if (t.proposalId) return `/proposals/${t.proposalId}`;
  if (t.projectId) return `/projects/${t.projectId}`;
  return `/companies/${t.companyId}`;
}

export async function uploadDocuments(target: Target, _p: ActionResult, fd: FormData) {
  const user = await requireUser();
  return run(async () => {
    const folder = reqStr(fd, "folder", "Folder");
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const link = str(fd, "externalUrl");
    if (!files.length && !link) throw new Error("Choose a file or paste a link.");
    for (const f of files) if (f.size > MAX_UPLOAD_BYTES) throw new Error(`${f.name} is larger than 25 MB.`);
    for (const f of files) {
      const saved = await storage.save(f, folder);
      await prisma.document.create({
        data: { ...target, folder, fileName: f.name, storageKey: saved.storageKey, externalUrl: saved.externalUrl, mimeType: f.type || null, size: f.size, uploadedById: user.id },
      });
    }
    if (link) {
      await prisma.document.create({ data: { ...target, folder, fileName: str(fd, "linkName") ?? link, externalUrl: link, uploadedById: user.id } });
    }
    revalidatePath(pathOf(target));
    return { ok: "Uploaded." };
  });
}

export async function deleteDocument(id: string) {
  await requireUser();
  const d = await prisma.document.delete({ where: { id } });
  if (d.storageKey) await storage.remove(d.storageKey);
  revalidatePath(pathOf({ proposalId: d.proposalId ?? undefined, projectId: d.projectId ?? undefined }));
}

export async function addNote(target: Target, _p: ActionResult, fd: FormData) {
  const user = await requireUser();
  return run(async () => {
    await prisma.note.create({
      data: {
        ...target,
        body: reqStr(fd, "body", "Note"),
        type: str(fd, "type") ?? "Note",
        date: dateOrNull(fd, "date") ?? new Date(),
        contactId: str(fd, "contactId"),
        userId: user.id,
      },
    });
    revalidatePath(pathOf(target));
    return { ok: "Note added." };
  });
}

export async function deleteNote(id: string) {
  const user = await requireUser();
  const n = await prisma.note.findUniqueOrThrow({ where: { id } });
  if (n.userId !== user.id && user.role !== "ADMIN") throw new Error("You can only delete your own notes.");
  await prisma.note.delete({ where: { id } });
  revalidatePath(pathOf({ proposalId: n.proposalId ?? undefined, projectId: n.projectId ?? undefined, companyId: n.companyId ?? undefined }));
}
