import "server-only";
import { prisma } from "./db";
import type { ListKey } from "./constants";

export async function listValues(list: ListKey) {
  const rows = await prisma.listItem.findMany({ where: { list, active: true }, orderBy: [{ sortOrder: "asc" }, { value: "asc" }] });
  return rows.map((r) => r.value);
}

export function companyLabel(c: { name: string; shortName: string | null }) {
  return c.shortName && c.shortName !== c.name ? `${c.shortName} — ${c.name}` : c.name;
}

/** Clients and prospects (proposal customer dropdown). */
export async function clientOptions() {
  const rows = await prisma.company.findMany({ where: { active: true, OR: [{ isClient: true }, { isProspect: true }] }, orderBy: { name: "asc" } });
  return rows.map((c) => ({ value: c.id, label: companyLabel(c) }));
}

export async function vendorOptions(kind: "acq" | "mapping") {
  const rows = await prisma.company.findMany({
    where: { active: true, ...(kind === "acq" ? { isAcqVendor: true } : { isMappingVendor: true }) },
    orderBy: [{ shortName: "asc" }, { name: "asc" }],
  });
  return rows.map((c) => ({ value: c.id, label: c.shortName ?? c.name }));
}

export async function contactOptions() {
  const rows = await prisma.contact.findMany({ where: { active: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
  return rows.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}`.trim(), group: c.companyId }));
}

export async function sensorOptions() {
  const rows = await prisma.vendorSensor.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return rows.map((s) => ({ value: s.id, label: s.sensorType ? `${s.name} (${s.sensorType})` : s.name, group: s.companyId }));
}

export async function userOptions() {
  const rows = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return rows.map((u) => ({ value: u.id, label: `${u.initials} — ${u.name}` }));
}

export async function projectOptions() {
  const rows = await prisma.project.findMany({ orderBy: { number: "desc" }, include: { company: true } });
  return rows.map((p) => ({ value: p.id, label: `${p.number} — ${p.company.shortName ?? p.company.name} ${p.name}` }));
}
