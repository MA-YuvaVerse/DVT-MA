import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: { id: string; role: "ADMIN" | "USER"; name: string }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current signed-in, active user, or null. */
export async function currentUser() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new Error("Only administrators can do this.");
  return u;
}
