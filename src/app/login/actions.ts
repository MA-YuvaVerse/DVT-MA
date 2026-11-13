"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/auth";

export async function login(_prev: { error?: string } | undefined, fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/");
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  await startSession(user);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
