import type { Prisma } from "@prisma/client";
import { ACQUISITION_METHODS } from "./constants";

type Tx = Prisma.TransactionClient;

async function nextCounter(tx: Tx, key: string, floor: number) {
  const row = await tx.counter.upsert({
    where: { key },
    create: { key, value: floor + 1 },
    update: { value: { increment: 1 } },
  });
  if (row.value <= floor) {
    const fixed = await tx.counter.update({ where: { key }, data: { value: floor + 1 } });
    return fixed.value;
  }
  return row.value;
}

/** Proposal number: year prefix + 5-digit yearly sequence, e.g. 202600362 (or 2600362). */
export async function nextProposalNumber(tx: Tx, yearDigits: 2 | 4, today = new Date()) {
  const year = today.getUTCFullYear();
  const prefix = yearDigits === 2 ? String(year).slice(2) : String(year);
  // never collide with numbers already in the database (e.g. migrated data)
  const existing = await tx.proposal.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });
  let floor = 0;
  for (const e of existing) {
    const rest = e.number.slice(prefix.length);
    if (/^\d{5}$/.test(rest)) floor = Math.max(floor, Number(rest));
  }
  const seq = await nextCounter(tx, `proposal-${prefix}`, floor);
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export function versionCode(proposalNumber: string, versionNo: number) {
  return `${proposalNumber}.${versionNo}`;
}

/**
 * Project number in DroneView's existing format: YYMM + infix ("18") +
 * 2-digit monthly sequence + acquisition suffix, e.g. 26071804P.
 * Add-on projects: parent number + "-n", e.g. 26071803P-1.
 */
export async function nextProjectNumber(
  tx: Tx,
  opts: { acquisitionMethod: string; infix: string; parent?: { id: string; number: string } | null; today?: Date },
) {
  if (opts.parent) {
    const siblings = await tx.project.findMany({ where: { parentProjectId: opts.parent.id }, select: { addOnSeq: true, number: true } });
    let max = 0;
    for (const s of siblings) {
      const m = s.number.match(/-(\d+)$/);
      max = Math.max(max, s.addOnSeq ?? 0, m ? Number(m[1]) : 0);
    }
    const seq = max + 1;
    return { number: `${opts.parent.number}-${seq}`, addOnSeq: seq };
  }
  const d = opts.today ?? new Date();
  const yymm = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const prefix = `${yymm}${opts.infix}`;
  const existing = await tx.project.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } });
  let floor = 0;
  for (const e of existing) {
    const m = e.number.slice(prefix.length).match(/^(\d{2})/);
    if (m) floor = Math.max(floor, Number(m[1]));
  }
  const seq = await nextCounter(tx, `project-${prefix}`, floor);
  const suffix = ACQUISITION_METHODS[opts.acquisitionMethod] ?? "";
  return { number: `${prefix}${String(seq).padStart(2, "0")}${suffix}`, addOnSeq: null };
}

export async function nextCompanyCode(tx: Tx) {
  const last = await tx.company.findMany({ select: { code: true } });
  let floor = 0;
  for (const c of last) {
    const m = c.code.match(/^C(\d+)$/);
    if (m) floor = Math.max(floor, Number(m[1]));
  }
  const seq = await nextCounter(tx, "company", floor);
  return `C${String(seq).padStart(4, "0")}`;
}
