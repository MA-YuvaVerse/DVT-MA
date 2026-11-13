export function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = typeof v === "object" && v !== null && "toNumber" in v ? (v as { toNumber(): number }).toNumber() : Number(v);
  return Number.isFinite(x) ? x : null;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(v: unknown, cents = false) {
  const x = toNum(v);
  if (x == null) return "—";
  return (cents ? usd2 : usd).format(x);
}

export function pct(v: number | null | undefined, digits = 0) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function num(v: unknown, digits = 0) {
  const x = toNum(v);
  if (x == null) return "—";
  return x.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function date(v: Date | string | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** yyyy-mm-dd for <input type="date"> */
export function dateInput(v: Date | null | undefined) {
  if (!v) return "";
  return v.toISOString().slice(0, 10);
}

export function cityState(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(", ");
}
