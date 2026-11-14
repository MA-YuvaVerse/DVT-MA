/** Pure parsing helpers for the workbook importer (unit tested). */
import { US_STATES } from "./constants";

export function normHeader(h: string) {
  return h.replace(/\s+/g, " ").trim().toLowerCase();
}

/** "2600361.1" / 2600361.1 / 2600429 -> { base: "2600361", suffix: 1, raw: "2600361.1" } */
export function parseLegacyId(v: unknown): { base: string; suffix: number; raw: string } | null {
  if (v == null) return null;
  let base: number, suffix: number;
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v <= 0) return null;
    base = Math.floor(v);
    suffix = Math.round((v - base) * 10);
  } else {
    const m = String(v).trim().match(/^(\d{5,9})(?:\.(\d{1,2}))?$/);
    if (!m) return null;
    base = Number(m[1]);
    suffix = m[2] ? Number(m[2]) : 0;
  }
  const b = String(base);
  if (b.length < 5 || b.length > 9) return null;
  return { base: b, suffix, raw: `${b}.${suffix}` };
}

/** Old "Odds" + "Opportunity Status Won/Lost" pair -> single opportunity status. */
export function mapLegacyStatus(odds: string | null, outcome: string | null): string {
  const o = (odds ?? "").toLowerCase();
  const r = (outcome ?? "").toLowerCase();
  if (o === "won" || r === "dvt won") return "DVT Won";
  if (o === "high") return "High Probability";
  if (o === "open") return "Proposal Sent";
  if (o === "suspended") return "On Hold";
  if (r.includes("option not considered")) return "Cancelled";
  if (r.startsWith("client won/dvt lost")) return "Client Won/DVT Lost";
  if (r === "client lost") return "Client Lost";
  if (o === "lost") return "Client Won/DVT Lost";
  if (o === "abandoned") return "Abandoned";
  return "Proposal Sent";
}

/** "Lake Town MI" -> { city: "Lake Town", state: "MI" } */
export function parseCityState(v: string | null): { city: string | null; state: string | null } {
  if (!v) return { city: null, state: null };
  const t = v.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.*?)[,\s]+([A-Za-z]{2})$/);
  if (m && US_STATES.includes(m[2].toUpperCase()) && !/(&|\band)$/i.test(m[1].trim())) return { city: m[1].trim() || null, state: m[2].toUpperCase() };
  return { city: t, state: null };
}

/** 40°30'00"N -> 40.5; W/S are negative. Plain decimals pass through. */
export function parseDms(v: string | null): number | null {
  if (!v) return null;
  const t = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = t.match(/(\d+)\s*°\s*(\d+)\s*['’]\s*([\d.]+)\s*["”]?\s*([NSEW])/i);
  if (!m) return null;
  const dec = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return Math.round((/[SW]/i.test(m[4]) ? -dec : dec) * 1e6) / 1e6;
}

/** Section header rows in the Projects sheet -> project status. */
export function projectGroupStatus(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("in production")) return "Production";
  if (t.includes("acquisition completed") || t.includes("waiting on")) return "Acquisition";
  if (t.includes("awarded")) return "Awarded";
  if (t.includes("ready for invoicing") || t.includes("delivered to client")) return "Ready for Invoicing";
  if (t.includes("on hold")) return "On Hold";
  if (t.includes("completed")) return "Completed";
  return null;
}

/** Acquisition method from the project number suffix (26071804P -> Plane). */
export function methodFromNumber(num: string): string | null {
  const m = num.match(/^\d{8}([A-Z])/i);
  return m ? ({ P: "Plane", D: "Drone", M: "Mobile", S: "Scanner" } as Record<string, string>)[m[1].toUpperCase()] ?? "Other" : null;
}
