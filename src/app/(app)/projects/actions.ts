"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/action";
import { bool, dateOrNull, numOrNull, reqStr, str } from "@/lib/form";
import { PROJECT_STATUSES } from "@/lib/constants";
import { nextProjectNumber } from "@/lib/numbering";
import { getSettings } from "@/lib/settings";
import { MILESTONES } from "./fields";

function details(fd: FormData) {
  return {
    name: reqStr(fd, "name", "Project name"),
    companyId: reqStr(fd, "companyId", "Client"),
    clientContactId: str(fd, "clientContactId"),
    dvtPmId: str(fd, "dvtPmId"),
    acquisitionMethod: str(fd, "acquisitionMethod"),
    pidOrTargets: str(fd, "pidOrTargets"),
    city: str(fd, "city"),
    state: str(fd, "state"),
    latitude: numOrNull(fd, "latitude"),
    longitude: numOrNull(fd, "longitude"),
    acres: numOrNull(fd, "acres"),
    linearMiles: numOrNull(fd, "linearMiles"),
    projectType: str(fd, "projectType"),
    sensorType: str(fd, "sensorType"),
    deliverables: str(fd, "deliverables"),
    folderUrl: str(fd, "folderUrl"),
    comments: str(fd, "comments"),
  };
}

export async function updateProjectDetails(id: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    await prisma.project.update({ where: { id }, data: details(fd) });
    revalidatePath(`/projects/${id}`);
    return { ok: "Project saved." };
  });
}

export async function updateEconomics(id: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    await prisma.project.update({
      where: { id },
      data: {
        clientPoJob: str(fd, "clientPoJob"),
        invoiceNumbers: str(fd, "invoiceNumbers"),
        contractValue: numOrNull(fd, "contractValue"),
        billedAmount: numOrNull(fd, "billedAmount"),
        acqVendorId: str(fd, "acqVendorId"),
        acqCost: numOrNull(fd, "acqCost"),
        processingVendorId: str(fd, "processingVendorId"),
        processingCost: numOrNull(fd, "processingCost"),
        mobCosts: numOrNull(fd, "mobCosts"),
        invoicePaid: bool(fd, "invoicePaid"),
      },
    });
    revalidatePath(`/projects/${id}`);
    return { ok: "Economics saved." };
  });
}

export async function updateMilestones(id: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const data: Record<string, Date | null> = {};
    for (const [k] of MILESTONES) data[k] = dateOrNull(fd, k);
    await prisma.project.update({ where: { id }, data });
    revalidatePath(`/projects/${id}`);
    return { ok: "Milestones saved." };
  });
}

export async function changeProjectStatus(id: string, _p: ActionResult, fd: FormData) {
  const user = await requireUser();
  return run(async () => {
    const to = reqStr(fd, "status", "Status");
    if (!(PROJECT_STATUSES as readonly string[]).includes(to)) throw new Error("Unknown status.");
    const p = await prisma.project.findUniqueOrThrow({ where: { id } });
    if (p.status === to) return { ok: "Status unchanged." };
    await prisma.project.update({
      where: { id },
      data: { status: to, statusChangedAt: new Date(), statusHistory: { create: { fromStatus: p.status, toStatus: to, userId: user.id } } },
    });
    revalidatePath(`/projects/${id}`);
    return { ok: `Moved to ${to}.` };
  });
}

export async function createProject(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let id = "";
  const res = await run(async () => {
    const d = details(fd);
    const settings = await getSettings();
    const manual = str(fd, "number");
    const parentId = str(fd, "parentProjectId");
    const awardDate = dateOrNull(fd, "awardDate") ?? new Date();
    const p = await prisma.$transaction(async (tx) => {
      const parent = parentId ? await tx.project.findUniqueOrThrow({ where: { id: parentId } }) : null;
      const gen = manual
        ? { number: manual, addOnSeq: null }
        : await nextProjectNumber(tx, { acquisitionMethod: d.acquisitionMethod ?? "Other", infix: settings.projectNumberInfix, parent, today: awardDate });
      return tx.project.create({
        data: { ...d, ...gen, parentProjectId: parent?.id ?? null, awardDate, status: "Awarded", statusHistory: { create: { toStatus: "Awarded", userId: user.id } } },
      });
    });
    id = p.id;
  });
  if (res?.error) return res;
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await requireAdmin();
  const addOns = await prisma.project.count({ where: { parentProjectId: id } });
  if (addOns) throw new Error("This project has add-on projects. Delete those first.");
  await prisma.proposal.updateMany({ where: { parentProjectId: id }, data: { parentProjectId: null, opportunityType: "NEW" } });
  await prisma.project.delete({ where: { id } });
  redirect("/projects");
}
