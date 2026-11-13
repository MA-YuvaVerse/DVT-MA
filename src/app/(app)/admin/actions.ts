"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin, requireUser, verifyPassword } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/action";
import { bool, intOrNull, reqStr, str } from "@/lib/form";
import { LISTS, PIPELINE_RULES } from "@/lib/constants";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";

function checkPassword(pw: string) {
  if (pw.length < 10) throw new Error("Passwords must be at least 10 characters.");
}

export async function saveUser(userId: string | null, _p: ActionResult, fd: FormData) {
  const admin = await requireAdmin();
  return run(async () => {
    const data = {
      name: reqStr(fd, "name", "Name"),
      initials: reqStr(fd, "initials", "Initials"),
      email: reqStr(fd, "email", "Email").toLowerCase(),
      role: str(fd, "role") === "ADMIN" ? ("ADMIN" as const) : ("USER" as const),
      active: userId ? bool(fd, "active") : true,
    };
    if (userId === admin.id && (!data.active || data.role !== "ADMIN")) throw new Error("You cannot deactivate or demote yourself.");
    const pw = str(fd, "password");
    if (pw) checkPassword(pw);
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { ...data, ...(pw ? { passwordHash: await hashPassword(pw) } : {}) } });
    } else {
      if (!pw) throw new Error("Set an initial password.");
      await prisma.user.create({ data: { ...data, passwordHash: await hashPassword(pw) } });
    }
    revalidatePath("/admin/users");
    return { ok: userId ? "User saved." : "User created." };
  });
}

export async function changeOwnPassword(_p: ActionResult, fd: FormData) {
  const user = await requireUser();
  return run(async () => {
    const current = reqStr(fd, "current", "Current password");
    const next = reqStr(fd, "next", "New password");
    if (next !== str(fd, "confirm")) throw new Error("New passwords do not match.");
    checkPassword(next);
    if (!(await verifyPassword(current, user.passwordHash))) throw new Error("Current password is incorrect.");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    return { ok: "Password changed." };
  });
}

export async function addListItem(list: string, _p: ActionResult, fd: FormData) {
  await requireAdmin();
  return run(async () => {
    if (!(list in LISTS)) throw new Error("Unknown list.");
    const value = reqStr(fd, "value", "Value");
    const max = await prisma.listItem.aggregate({ where: { list }, _max: { sortOrder: true } });
    await prisma.listItem.create({ data: { list, value, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    revalidatePath("/admin/lists");
    return { ok: `Added “${value}”.` };
  });
}

export async function updateListItem(id: string, _p: ActionResult, fd: FormData) {
  await requireAdmin();
  return run(async () => {
    await prisma.listItem.update({ where: { id }, data: { value: reqStr(fd, "value", "Value"), sortOrder: intOrNull(fd, "sortOrder") ?? 0, active: bool(fd, "active") } });
    revalidatePath("/admin/lists");
    return { ok: "Saved." };
  });
}

export async function saveSettings(_p: ActionResult, fd: FormData) {
  await requireAdmin();
  return run(async () => {
    const rule = reqStr(fd, "pipelineRule");
    if (!(rule in PIPELINE_RULES)) throw new Error("Unknown pipeline rule.");
    const pctKeys: SettingKey[] = ["probPreparing", "probOpen", "probOpenStale", "probHigh"];
    for (const k of pctKeys) {
      const v = Number(reqStr(fd, k));
      if (!(v >= 0 && v <= 100)) throw new Error("Probabilities must be between 0 and 100.");
    }
    const infix = reqStr(fd, "projectNumberInfix");
    if (!/^\d{0,4}$/.test(infix)) throw new Error("Project number infix must be up to 4 digits.");
    for (const k of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      const v = str(fd, k);
      if (v != null) await prisma.setting.upsert({ where: { key: k }, create: { key: k, value: v }, update: { value: v } });
    }
    revalidatePath("/", "layout");
    return { ok: "Settings saved." };
  });
}
