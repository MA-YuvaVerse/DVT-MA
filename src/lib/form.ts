/** Helpers to read typed values from submitted FormData. */
export function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
export function reqStr(fd: FormData, k: string, label = k): string {
  const v = str(fd, k);
  if (!v) throw new Error(`${label} is required.`);
  return v;
}
export function numOrNull(fd: FormData, k: string): number | null {
  const v = str(fd, k);
  if (v == null) return null;
  const x = Number(v.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(x)) throw new Error(`${k} must be a number.`);
  return x;
}
export function intOrNull(fd: FormData, k: string): number | null {
  const x = numOrNull(fd, k);
  return x == null ? null : Math.round(x);
}
export function dateOrNull(fd: FormData, k: string): Date | null {
  const v = str(fd, k);
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${k} is not a valid date.`);
  return d;
}
export function bool(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
}
