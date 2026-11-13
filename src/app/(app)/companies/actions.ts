"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/action";
import { bool, reqStr, str } from "@/lib/form";
import { nextCompanyCode } from "@/lib/numbering";

function companyData(fd: FormData) {
  const d = {
    name: reqStr(fd, "name", "Company name"),
    shortName: str(fd, "shortName"),
    isClient: bool(fd, "isClient"),
    isProspect: bool(fd, "isProspect"),
    isAcqVendor: bool(fd, "isAcqVendor"),
    isMappingVendor: bool(fd, "isMappingVendor"),
    vendorType: str(fd, "vendorType"),
    active: bool(fd, "active"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    state: str(fd, "state"),
    phone: str(fd, "phone"),
    website: str(fd, "website"),
    qboCustomerId: str(fd, "qboCustomerId"),
    qboVendorId: str(fd, "qboVendorId"),
    notes: str(fd, "notes"),
  };
  if (!d.isClient && !d.isProspect && !d.isAcqVendor && !d.isMappingVendor) throw new Error("Pick at least one company type.");
  return d;
}

export async function createCompany(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireUser();
  let id = "";
  const res = await run(async () => {
    const data = companyData(fd);
    const c = await prisma.$transaction(async (tx) => tx.company.create({ data: { ...data, code: await nextCompanyCode(tx) } }));
    id = c.id;
  });
  if (res?.error) return res;
  redirect(`/companies/${id}`);
}

export async function updateCompany(id: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    await prisma.company.update({ where: { id }, data: companyData(fd) });
    revalidatePath(`/companies/${id}`);
    return { ok: "Company saved." };
  });
}

export async function deleteCompany(id: string) {
  await requireAdmin();
  const [p, pr, q1, q2] = await Promise.all([
    prisma.proposal.count({ where: { companyId: id } }),
    prisma.project.count({ where: { OR: [{ companyId: id }, { acqVendorId: id }, { processingVendorId: id }] } }),
    prisma.acquisitionQuote.count({ where: { vendorId: id } }),
    prisma.mappingQuote.count({ where: { vendorId: id } }),
  ]);
  if (p + pr + q1 + q2) throw new Error("This company has proposals, projects or quotes. Mark it inactive instead.");
  await prisma.contact.deleteMany({ where: { companyId: id } });
  await prisma.company.delete({ where: { id } });
  redirect("/companies");
}

function contactData(fd: FormData) {
  return {
    firstName: reqStr(fd, "firstName", "First name"),
    lastName: str(fd, "lastName") ?? "",
    title: str(fd, "title"),
    email: str(fd, "email")?.toLowerCase() ?? null,
    phone: str(fd, "phone"),
    location: str(fd, "location"),
    notes: str(fd, "notes"),
  };
}

export async function saveContact(companyId: string, contactId: string | null, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const data = contactData(fd);
    if (contactId) await prisma.contact.update({ where: { id: contactId }, data: { ...data, active: bool(fd, "active") } });
    else await prisma.contact.create({ data: { ...data, companyId } });
    revalidatePath(`/companies/${companyId}`);
    return { ok: contactId ? "Contact saved." : "Contact added." };
  });
}

/** Person moved to another employer: deactivate here, create a new contact there. History stays with the old company. */
export async function moveContact(contactId: string, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const newCompanyId = reqStr(fd, "newCompanyId", "New company");
    const old = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
    if (old.companyId === newCompanyId) throw new Error("Pick a different company.");
    await prisma.$transaction([
      prisma.contact.update({ where: { id: contactId }, data: { active: false, notes: [old.notes, `Moved to another company on ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join("\n") } }),
      prisma.contact.create({
        data: { companyId: newCompanyId, firstName: old.firstName, lastName: old.lastName, title: str(fd, "newTitle") ?? old.title, email: str(fd, "newEmail"), phone: str(fd, "newPhone") },
      }),
    ]);
    revalidatePath(`/companies/${old.companyId}`);
    return { ok: "Contact moved. The old record is inactive and keeps its history." };
  });
}

export async function saveSensor(companyId: string, sensorId: string | null, _p: ActionResult, fd: FormData) {
  await requireUser();
  return run(async () => {
    const data = { name: reqStr(fd, "name", "Sensor"), sensorType: str(fd, "sensorType"), active: sensorId ? bool(fd, "active") : true, notes: str(fd, "notes") };
    if (sensorId) await prisma.vendorSensor.update({ where: { id: sensorId }, data });
    else await prisma.vendorSensor.create({ data: { ...data, companyId } });
    revalidatePath(`/companies/${companyId}`);
    return { ok: sensorId ? "Sensor saved." : "Sensor added." };
  });
}

/**
 * Merge a duplicate company (e.g. two spellings) into another. Everything that
 * points at the duplicate is moved to the target, its roles are combined and
 * the duplicate is deleted.
 */
export async function mergeCompany(sourceId: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const targetId = str(fd, "targetId");
  const res = await run(async () => {
    if (!targetId || targetId === sourceId) throw new Error("Pick the company to merge into.");
    const [src, tgt] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: sourceId }, include: { sensors: true } }),
      prisma.company.findUniqueOrThrow({ where: { id: targetId }, include: { sensors: true } }),
    ]);
    await prisma.$transaction(async (tx) => {
      for (const s of src.sensors) {
        const same = tgt.sensors.find((t) => t.name.toLowerCase() === s.name.toLowerCase());
        if (same) {
          await tx.acquisitionQuote.updateMany({ where: { sensorId: s.id }, data: { sensorId: same.id } });
          await tx.vendorSensor.delete({ where: { id: s.id } });
        } else {
          await tx.vendorSensor.update({ where: { id: s.id }, data: { companyId: targetId } });
        }
      }
      await tx.contact.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } });
      await tx.proposal.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } });
      await tx.project.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } });
      await tx.project.updateMany({ where: { acqVendorId: sourceId }, data: { acqVendorId: targetId } });
      await tx.project.updateMany({ where: { processingVendorId: sourceId }, data: { processingVendorId: targetId } });
      await tx.acquisitionQuote.updateMany({ where: { vendorId: sourceId }, data: { vendorId: targetId } });
      await tx.mappingQuote.updateMany({ where: { vendorId: sourceId }, data: { vendorId: targetId } });
      await tx.note.updateMany({ where: { companyId: sourceId }, data: { companyId: targetId } });
      await tx.company.delete({ where: { id: sourceId } });
      await tx.company.update({
        where: { id: targetId },
        data: {
          isClient: tgt.isClient || src.isClient,
          isProspect: tgt.isProspect || src.isProspect,
          isAcqVendor: tgt.isAcqVendor || src.isAcqVendor,
          isMappingVendor: tgt.isMappingVendor || src.isMappingVendor,
          qboCustomerId: tgt.qboCustomerId ?? src.qboCustomerId,
          qboVendorId: tgt.qboVendorId ?? src.qboVendorId,
          notes: [tgt.notes, `Merged from “${src.name}” on ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join("\n"),
        },
      });
    });
  });
  if (res?.error) return res;
  redirect(`/companies/${targetId}`);
}
