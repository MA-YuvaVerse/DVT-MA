"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/action";
import { bool, dateOrNull, intOrNull, numOrNull, reqStr, str } from "@/lib/form";
import { nextProjectNumber, nextProposalNumber, versionCode } from "@/lib/numbering";
import { getSettings } from "@/lib/settings";
import { OPEN_STATUSES, QUOTE_STATUSES, VERSION_STATUSES, WON_STATUS } from "@/lib/constants";
import { selectedTotal } from "@/lib/calc";
import { toNum } from "@/lib/format";

function proposalHeader(fd: FormData) {
  const opportunityType = str(fd, "opportunityType") === "ADD_ON" ? "ADD_ON" : "NEW";
  const parentProjectId = opportunityType === "ADD_ON" ? str(fd, "parentProjectId") : null;
  if (opportunityType === "ADD_ON" && !parentProjectId) throw new Error("Choose the parent project for an add-on.");
  return {
    companyId: reqStr(fd, "companyId", "Client"),
    clientContactId: str(fd, "clientContactId"),
    dvtPmId: str(fd, "dvtPmId"),
    opportunityType,
    parentProjectId,
    city: str(fd, "city"),
    state: str(fd, "state"),
    latitude: numOrNull(fd, "latitude"),
    longitude: numOrNull(fd, "longitude"),
    folderUrl: str(fd, "folderUrl"),
    comments: str(fd, "comments"),
  } as const;
}

function status(fd: FormData) {
  const s = str(fd, "status") ?? "Preparing Proposal";
  if (!(VERSION_STATUSES as readonly string[]).includes(s)) throw new Error("Unknown status.");
  return s;
}

function versionFields(fd: FormData) {
  const isLinear = bool(fd, "isLinear");
  return {
    title: reqStr(fd, "title", "Project name"),
    requestDate: dateOrNull(fd, "requestDate"),
    dueDate: dateOrNull(fd, "dueDate"),
    lastClientContactDate: dateOrNull(fd, "lastClientContactDate"),
    followUpDate: dateOrNull(fd, "followUpDate"),
    proposalValue: numOrNull(fd, "proposalValue"),
    mappingAcres: numOrNull(fd, "mappingAcres"),
    flightAcres: numOrNull(fd, "flightAcres"),
    isLinear,
    linearMiles: isLinear ? numOrNull(fd, "linearMiles") : null,
    linearWidthFt: isLinear ? numOrNull(fd, "linearWidthFt") : null,
    gsdCm: numOrNull(fd, "gsdCm"),
    lidarPpsm: numOrNull(fd, "lidarPpsm"),
    projectType: str(fd, "projectType"),
    sensorType: str(fd, "sensorType"),
    deliverables: str(fd, "deliverables"),
    comments: str(fd, "versionComments"),
  };
}

export async function createProposal(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let id = "";
  const res = await run(async () => {
    const header = proposalHeader(fd);
    const v = versionFields(fd);
    const settings = await getSettings();
    const p = await prisma.$transaction(async (tx) => {
      const number = await nextProposalNumber(tx, settings.proposalYearDigits === "2" ? 2 : 4);
      return tx.proposal.create({
        data: {
          ...header,
          number,
          createdById: user.id,
          versions: {
            create: { ...v, versionNo: 1, code: versionCode(number, 1), status: status(fd), requestDate: v.requestDate ?? new Date() },
          },
        },
      });
    });
    id = p.id;
  });
  if (res?.error) return res;
  redirect(`/proposals/${id}`);
}

export async function updateProposal(id: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    await prisma.proposal.update({ where: { id }, data: proposalHeader(fd) });
    revalidatePath(`/proposals/${id}`);
    return { ok: "Proposal saved." };
  });
}

export async function deleteProposal(id: string) {
  await requireAdmin();
  const linked = await prisma.project.count({ where: { proposalId: id } });
  if (linked) throw new Error("This proposal has a project. Delete or unlink the project first.");
  await prisma.proposal.delete({ where: { id } });
  redirect("/proposals");
}

export async function addVersion(proposalId: string, fromVersionId: string | null, fd: FormData) {
  await requireUser();
  const copyQuotes = bool(fd, "copyQuotes");
  const p = await prisma.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { versions: { select: { versionNo: true } } } });
  const versionNo = Math.max(0, ...p.versions.map((v) => v.versionNo)) + 1;
  const src = fromVersionId
    ? await prisma.proposalVersion.findUnique({ where: { id: fromVersionId }, include: { acqQuotes: true, mappingQuotes: true } })
    : null;
  const created = await prisma.proposalVersion.create({
    data: {
      proposalId,
      versionNo,
      code: versionCode(p.number, versionNo),
      title: src ? src.title : "New version",
      status: "Preparing Proposal",
      requestDate: src?.requestDate ?? new Date(),
      dueDate: src?.dueDate,
      proposalValue: src?.proposalValue,
      internalCost: src?.internalCost,
      mappingAcres: src?.mappingAcres,
      flightAcres: src?.flightAcres,
      isLinear: src?.isLinear ?? false,
      linearMiles: src?.linearMiles,
      linearWidthFt: src?.linearWidthFt,
      gsdCm: src?.gsdCm,
      lidarPpsm: src?.lidarPpsm,
      projectType: src?.projectType,
      sensorType: src?.sensorType,
      deliverables: src?.deliverables,
      acqQuotes: copyQuotes && src
        ? { create: src.acqQuotes.map((q) => ({ vendorId: q.vendorId, sensorId: q.sensorId, cost: q.cost, frameCount: q.frameCount, quoteDate: q.quoteDate, status: q.status, isSelected: q.isSelected, comments: q.comments })) }
        : undefined,
      mappingQuotes: copyQuotes && src
        ? { create: src.mappingQuotes.map((q) => ({ vendorId: q.vendorId, cost: q.cost, days: q.days, quoteDate: q.quoteDate, status: q.status, isSelected: q.isSelected, comments: q.comments })) }
        : undefined,
    },
  });
  redirect(`/proposals/${proposalId}?v=${created.id}`);
}

export async function updateVersion(versionId: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const v = await prisma.proposalVersion.findUniqueOrThrow({ where: { id: versionId } });
    const s = status(fd);
    if (s === WON_STATUS && v.status !== WON_STATUS) throw new Error("Use the Award tab to mark a version as won, so the project is created.");
    await prisma.proposalVersion.update({
      where: { id: versionId },
      data: { ...versionFields(fd), status: s, statusChangedAt: s !== v.status ? new Date() : undefined },
    });
    revalidatePath(`/proposals/${v.proposalId}`);
    return { ok: "Version saved." };
  });
}

export async function updateInternalCost(versionId: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const v = await prisma.proposalVersion.update({ where: { id: versionId }, data: { internalCost: numOrNull(fd, "internalCost") } });
    revalidatePath(`/proposals/${v.proposalId}`);
    return { ok: "Internal cost saved." };
  });
}

export async function deleteVersion(versionId: string) {
  await requireAdmin();
  const v = await prisma.proposalVersion.findUniqueOrThrow({ where: { id: versionId }, include: { projects: true, proposal: { include: { versions: true } } } });
  if (v.projects.length) throw new Error("This version has a project and cannot be deleted.");
  if (v.proposal.versions.length <= 1) throw new Error("A proposal needs at least one version.");
  await prisma.proposalVersion.delete({ where: { id: versionId } });
  redirect(`/proposals/${v.proposalId}`);
}

// ---------- Vendor quotes ----------

function quoteStatus(fd: FormData) {
  const s = str(fd, "quoteStatus") ?? "Requested";
  if (!(QUOTE_STATUSES as readonly string[]).includes(s)) throw new Error("Unknown quote status.");
  return s;
}

async function proposalIdOfVersion(versionId: string) {
  return (await prisma.proposalVersion.findUniqueOrThrow({ where: { id: versionId }, select: { proposalId: true } })).proposalId;
}

export async function saveAcqQuote(versionId: string, quoteId: string | null, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const data = {
      vendorId: reqStr(fd, "vendorId", "Vendor"),
      sensorId: str(fd, "sensorId"),
      cost: numOrNull(fd, "cost"),
      frameCount: intOrNull(fd, "frameCount"),
      quoteDate: dateOrNull(fd, "quoteDate"),
      status: quoteStatus(fd),
      isSelected: bool(fd, "isSelected"),
      comments: str(fd, "comments"),
    };
    if (quoteId) await prisma.acquisitionQuote.update({ where: { id: quoteId }, data });
    else await prisma.acquisitionQuote.create({ data: { ...data, versionId } });
    revalidatePath(`/proposals/${await proposalIdOfVersion(versionId)}`);
    return { ok: quoteId ? "Quote saved." : "Quote added." };
  });
}

export async function deleteAcqQuote(quoteId: string) {
  await requireUser();
  const q = await prisma.acquisitionQuote.delete({ where: { id: quoteId } });
  revalidatePath(`/proposals/${await proposalIdOfVersion(q.versionId)}`);
}

export async function saveMappingQuote(versionId: string, quoteId: string | null, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const data = {
      vendorId: reqStr(fd, "vendorId", "Vendor"),
      cost: numOrNull(fd, "cost"),
      days: intOrNull(fd, "days"),
      quoteDate: dateOrNull(fd, "quoteDate"),
      status: quoteStatus(fd),
      isSelected: bool(fd, "isSelected"),
      comments: str(fd, "comments"),
    };
    if (quoteId) await prisma.mappingQuote.update({ where: { id: quoteId }, data });
    else await prisma.mappingQuote.create({ data: { ...data, versionId } });
    revalidatePath(`/proposals/${await proposalIdOfVersion(versionId)}`);
    return { ok: quoteId ? "Quote saved." : "Quote added." };
  });
}

export async function deleteMappingQuote(quoteId: string) {
  await requireUser();
  const q = await prisma.mappingQuote.delete({ where: { id: quoteId } });
  revalidatePath(`/proposals/${await proposalIdOfVersion(q.versionId)}`);
}

// ---------- Award -> project ----------

export async function awardVersion(versionId: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let projectId = "";
  const res = await run(async () => {
    const acquisitionMethod = reqStr(fd, "acquisitionMethod", "Acquisition method");
    const othersTo = str(fd, "othersTo");
    const awardDate = dateOrNull(fd, "awardDate") ?? new Date();
    const settings = await getSettings();
    const v = await prisma.proposalVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { projects: true, acqQuotes: true, mappingQuotes: true, proposal: { include: { parentProject: true } } },
    });
    if (v.projects.length) throw new Error("A project already exists for this version.");
    const p = v.proposal;
    const selAcq = v.acqQuotes.filter((q) => q.isSelected);
    const selMap = v.mappingQuotes.filter((q) => q.isSelected);
    const project = await prisma.$transaction(async (tx) => {
      const { number, addOnSeq } = await nextProjectNumber(tx, {
        acquisitionMethod,
        infix: settings.projectNumberInfix,
        parent: p.opportunityType === "ADD_ON" && p.parentProject ? { id: p.parentProject.id, number: p.parentProject.number } : null,
        today: awardDate,
      });
      await tx.proposalVersion.update({ where: { id: v.id }, data: { status: WON_STATUS, statusChangedAt: new Date() } });
      if (othersTo) {
        await tx.proposalVersion.updateMany({
          where: { proposalId: p.id, id: { not: v.id }, status: { in: [...OPEN_STATUSES] } },
          data: { status: othersTo, statusChangedAt: new Date() },
        });
      }
      return tx.project.create({
        data: {
          number,
          addOnSeq,
          name: v.title,
          companyId: p.companyId,
          clientContactId: p.clientContactId,
          dvtPmId: p.dvtPmId,
          proposalId: p.id,
          versionId: v.id,
          parentProjectId: p.opportunityType === "ADD_ON" ? p.parentProjectId : null,
          acquisitionMethod,
          status: "Awarded",
          awardDate,
          city: p.city,
          state: p.state,
          latitude: p.latitude,
          longitude: p.longitude,
          acres: v.mappingAcres,
          linearMiles: v.linearMiles,
          projectType: v.projectType,
          sensorType: v.sensorType,
          deliverables: v.deliverables,
          folderUrl: p.folderUrl,
          contractValue: v.proposalValue,
          acqVendorId: selAcq[0]?.vendorId ?? null,
          acqCost: selAcq.length ? selectedTotal(selAcq.map((q) => ({ cost: toNum(q.cost), isSelected: true }))) : null,
          processingVendorId: selMap[0]?.vendorId ?? null,
          processingCost: selMap.length ? selectedTotal(selMap.map((q) => ({ cost: toNum(q.cost), isSelected: true }))) : null,
          mobCosts: v.internalCost,
          statusHistory: { create: { toStatus: "Awarded", userId: user.id } },
        },
      });
    });
    projectId = project.id;
  });
  if (res?.error) return res;
  redirect(`/projects/${projectId}`);
}
