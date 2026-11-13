import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";

export type ActionResult = { error?: string; ok?: string } | undefined;

/** Run a server-action body and turn thrown errors into a form message. */
export async function run(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    return (await fn()) ?? { ok: "Saved." };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: `That value is already in use (${(e.meta?.target as string[] | undefined)?.join(", ") ?? "unique field"}).` };
      if (e.code === "P2003") return { error: "This record is still referenced by other records." };
    }
    console.error(e);
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
