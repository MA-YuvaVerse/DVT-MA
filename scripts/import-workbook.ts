/**
 * Imports DroneView's tracking workbook (Proposals, Data Acquisition Quotes,
 * Jobs, Projects sheets) into the database.
 *
 *   npm run import:workbook -- ./data/workbook.xlsx            # add to existing data
 *   npm run import:workbook -- ./data/workbook.xlsx --reset    # wipe business data first
 *   npm run import:workbook -- ./data/workbook.xlsx --dry-run  # parse and report only
 *
 * Keep client workbooks in ./data (git-ignored). Users, dropdown lists and
 * settings are kept on --reset; companies, proposals, quotes, projects,
 * notes and documents are deleted.
 */
import ExcelJS from "exceljs";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mapLegacyStatus, parseCityState, parseDms, parseLegacyId, projectGroupStatus, methodFromNumber, normHeader } from "../src/lib/import-helpers";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const RESET = args.includes("--reset");
const DRY = args.includes("--dry-run");
const warnings: string[] = [];
const warn = (m: string) => warnings.push(m);

type Row = Record<string, unknown>;

/** Plain value of an exceljs cell (formula results, rich text, hyperlinks). */
function plain(v: ExcelJS.CellValue): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("error" in o) return null;
    if ("result" in o) return plain(o.result as ExcelJS.CellValue);
    if ("richText" in o) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if ("text" in o) return o.text;
    if ("hyperlink" in o) return o.hyperlink;
    return null;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || /^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?)$/.test(t)) return null;
    return t;
  }
  return v;
}

/** Read a sheet into objects keyed by normalised header (first occurrence wins). */
function readSheet(ws: ExcelJS.Worksheet, headerFirstCell: string) {
  let headerRow = 0;
  ws.eachRow((row, n) => {
    if (!headerRow && normHeader(String(plain(row.getCell(1).value) ?? "")) === normHeader(headerFirstCell)) headerRow = n;
  });
  if (!headerRow) throw new Error(`Sheet "${ws.name}": header "${headerFirstCell}" not found`);
  const cols = new Map<string, number>();
  ws.getRow(headerRow).eachCell((c, i) => {
    const h = normHeader(String(plain(c.value) ?? ""));
    if (h && !cols.has(h)) cols.set(h, i);
  });
  const rows: (Row & { _row: number; _first: unknown })[] = [];
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const r: Row & { _row: number; _first: unknown } = { _row: n, _first: plain(row.getCell(1).value) };
    for (const [h, i] of cols) r[h] = plain(row.getCell(i).value);
    rows.push(r);
  });
  return { rows, cols };
}

const g = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[normHeader(k)];
    if (v != null && v !== "") return v;
  }
  return null;
};
const s = (r: Row, ...k: string[]) => {
  const v = g(r, ...k);
  return v == null ? null : String(v).trim() || null;
};
const n = (r: Row, ...k: string[]) => {
  const v = g(r, ...k);
  if (v == null) return null;
  const x = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(x) ? x : null;
};
const d = (r: Row, ...k: string[]) => {
  const v = g(r, ...k);
  return v instanceof Date && !Number.isNaN(v.getTime()) ? v : null;
};
const isNA = (v: string | null) => !v || /^(na|n\/a|none|-|pending|tbd)$/i.test(v);

// ---------- master data caches ----------
const companies = new Map<string, { id: string }>();
let companySeq = 0;
async function company(name: string, roles: Partial<Record<"isClient" | "isAcqVendor" | "isMappingVendor", boolean>>) {
  const clean = name.replace(/\s+/g, " ").trim();
  const key = clean.toLowerCase();
  let c = companies.get(key);
  if (!c) {
    const existing = await prisma.company.findFirst({ where: { OR: [{ name: { equals: clean, mode: "insensitive" } }, { shortName: { equals: clean, mode: "insensitive" } }] } });
    if (existing) c = existing;
    else {
      if (!companySeq) {
        const all = await prisma.company.findMany({ select: { code: true } });
        companySeq = Math.max(0, ...all.map((x) => Number(x.code.replace(/\D/g, "")) || 0));
      }
      c = await prisma.company.create({ data: { code: `C${String(++companySeq).padStart(4, "0")}`, name: clean, shortName: clean } });
    }
    companies.set(key, c);
  }
  const set = Object.fromEntries(Object.entries(roles).filter(([, v]) => v));
  if (Object.keys(set).length) await prisma.company.update({ where: { id: c.id }, data: set });
  return c;
}

const contacts = new Map<string, string>();
async function contact(companyId: string, full: string) {
  const key = `${companyId}|${full.toLowerCase()}`;
  if (contacts.has(key)) return contacts.get(key)!;
  const [firstName, ...rest] = full.replace(/\s+/g, " ").trim().split(" ");
  const lastName = rest.join(" ");
  const existing = await prisma.contact.findFirst({ where: { companyId, firstName: { equals: firstName, mode: "insensitive" }, lastName: { equals: lastName, mode: "insensitive" } } });
  const id = existing?.id ?? (await prisma.contact.create({ data: { companyId, firstName, lastName } })).id;
  contacts.set(key, id);
  return id;
}

const users = new Map<string, string>();
async function pmUser(initials: string) {
  const key = initials.trim().toUpperCase();
  if (users.has(key)) return users.get(key)!;
  const existing = await prisma.user.findFirst({ where: { initials: { equals: key, mode: "insensitive" } } });
  const id = existing?.id ?? (await prisma.user.create({
    // Placeholder login: an admin sets the real name, email and password under Admin → Users.
    data: { initials: key, name: key, email: `${key.toLowerCase()}@users.invalid`, passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10) },
  })).id;
  users.set(key, id);
  return id;
}

async function sensor(companyId: string, name: string, sensorType: string | null) {
  const s = await prisma.vendorSensor.upsert({ where: { companyId_name: { companyId, name } }, create: { companyId, name, sensorType }, update: {} });
  return s.id;
}

const listSeen: Record<string, Set<string>> = { PROJECT_TYPE: new Set(), SENSOR_TYPE: new Set(), DELIVERABLE: new Set() };
async function saveLists() {
  for (const [list, values] of Object.entries(listSeen)) {
    const max = (await prisma.listItem.aggregate({ where: { list }, _max: { sortOrder: true } }))._max.sortOrder ?? 0;
    let i = max;
    for (const value of values) {
      await prisma.listItem.upsert({ where: { list_value: { list, value } }, create: { list, value, sortOrder: ++i }, update: {} });
    }
  }
}

async function reset() {
  await prisma.$transaction([
    prisma.note.deleteMany(), prisma.document.deleteMany(), prisma.statusHistory.deleteMany(),
    prisma.acquisitionQuote.deleteMany(), prisma.mappingQuote.deleteMany(),
    prisma.proposal.updateMany({ data: { parentProjectId: null } }),
    prisma.project.updateMany({ data: { parentProjectId: null } }),
    prisma.project.deleteMany(), prisma.proposalVersion.deleteMany(), prisma.proposal.deleteMany(),
    prisma.vendorSensor.deleteMany(), prisma.contact.deleteMany(), prisma.company.deleteMany(),
    prisma.counter.deleteMany(),
  ]);
}

async function main() {
  if (!file) throw new Error("Usage: npm run import:workbook -- <path-to.xlsx> [--reset] [--dry-run]");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = (name: string) => {
    const ws = wb.worksheets.find((w) => normHeader(w.name) === normHeader(name));
    if (!ws) warn(`Sheet "${name}" not found — skipped`);
    return ws;
  };

  const props = sheet("Proposals") ? readSheet(sheet("Proposals")!, "Proposal ID").rows.filter((r) => parseLegacyId(r._first)) : [];
  const daqSheet = sheet("Data Acquisition Quotes") ?? sheet("Data Acquisition");
  const daq = daqSheet ? readSheet(daqSheet, "Proposal ID").rows.filter((r) => parseLegacyId(r._first)) : [];
  const jobs = sheet("Jobs") ? readSheet(sheet("Jobs")!, "DVT Project #").rows.filter((r) => /^\s*\d{8}/.test(String(r._first ?? ""))) : [];
  const projSheet = sheet("Projects");
  const projRaw = projSheet ? readSheet(projSheet, "DVT Project #").rows : [];

  // Projects sheet: section header rows set the status of the rows below them
  let group: string | null = null;
  const projs: (Row & { _status: string })[] = [];
  for (const r of projRaw) {
    const first = String(r._first ?? "").trim();
    if (!first) continue;
    if (/^\d{8}/.test(first)) projs.push({ ...r, _status: group ?? "Awarded" });
    else group = projectGroupStatus(first) ?? group;
  }
  console.log(`Parsed: ${props.length} proposal rows, ${daq.length} acquisition rows, ${jobs.length} job rows, ${projs.length} project rows`);
  if (DRY) return;
  if (RESET) {
    await reset();
    console.log("Reset: business data cleared (users, lists and settings kept).");
  }

  // ---------- Proposals ----------
  const byBase = new Map<string, Row[]>();
  for (const r of props) {
    const id = parseLegacyId(r._first)!;
    byBase.set(id.base, [...(byBase.get(id.base) ?? []), r]);
  }
  const versionByLegacy = new Map<string, string>();
  const proposalByProjectNo = new Map<string, { proposalId: string; versionId: string; companyId: string }>();
  let pCount = 0, vCount = 0, mqCount = 0;
  for (const [base, rows] of byBase) {
    rows.sort((a, b) => parseLegacyId(a._first)!.suffix - parseLegacyId(b._first)!.suffix);
    const head = rows[0];
    const clientName = s(head, "Client");
    if (!clientName) { warn(`Proposal ${base}: no client — skipped`); continue; }
    const c = await company(clientName, { isClient: true });
    const pm = s(head, "Client's PM");
    const dvt = s(head, "DVT PM");
    const loc = parseCityState(s(head, "City/State"));
    const folderId = s(head, "Proposal Folder URL - https://drive.google.com/drive/folders/");
    if (await prisma.proposal.findUnique({ where: { number: base } })) { warn(`Proposal ${base} already exists — skipped`); continue; }
    const proposal = await prisma.proposal.create({
      data: {
        number: base, companyId: c.id, city: loc.city, state: loc.state,
        clientContactId: pm ? await contact(c.id, pm) : null,
        dvtPmId: dvt ? await pmUser(dvt) : null,
        folderUrl: folderId && /^[\w-]{15,}$/.test(folderId) ? `https://drive.google.com/drive/folders/${folderId}` : null,
      },
    });
    pCount++;
    const made: { id: string; status: string }[] = [];
    for (const [i, r] of rows.entries()) {
      const legacy = parseLegacyId(r._first)!;
      const miles = n(r, "Linear Project Miles");
      for (const [list, key] of [["PROJECT_TYPE", "Project Type"], ["SENSOR_TYPE", "Sensor(s) Type"], ["DELIVERABLE", "Project Deliverables"]] as const) {
        const v = s(r, key);
        if (v) listSeen[list].add(v);
      }
      const v = await prisma.proposalVersion.create({
        data: {
          proposalId: proposal.id, versionNo: i + 1, code: `${base}.${i + 1}`, legacyId: legacy.raw,
          title: s(r, "Project Name") ?? "(untitled)",
          status: mapLegacyStatus(s(r, "Odds"), s(r, "Opportunity Status Won/Lost")),
          requestDate: d(r, "Proposal Request Date"), followUpDate: d(r, "Latest follow up date"),
          proposalValue: n(r, "Proposal Total"), mappingAcres: n(r, "Project Acres"),
          isLinear: !!miles, linearMiles: miles, linearWidthFt: n(r, "Linear Project Width (feet)"),
          projectType: s(r, "Project Type"), sensorType: s(r, "Sensor(s) Type"), deliverables: s(r, "Project Deliverables"),
          comments: s(r, "Proposal Comments"),
        },
      });
      vCount++;
      made.push({ id: v.id, status: v.status });
      versionByLegacy.set(legacy.raw, v.id);
      const projNo = s(r, "DVT Project Number");
      if (projNo) for (const pn of projNo.split(/[;,\s]+/)) if (/^\d{8}/.test(pn)) proposalByProjectNo.set(pn, { proposalId: proposal.id, versionId: v.id, companyId: c.id });
      // Mapping quotes held as fixed columns on the Proposals sheet
      const mapping: [string, number | null, number | null][] = [["BPS", n(r, "BPS Cost"), n(r, "BPS Days")], ["ED", n(r, "ED Cost"), n(r, "ED Days")]];
      const priced = mapping.filter(([, cost]) => cost != null);
      for (const [name, cost, days] of priced) {
        const vendor = await company(name, { isMappingVendor: true });
        await prisma.mappingQuote.create({ data: { versionId: v.id, vendorId: vendor.id, cost, days: days == null ? null : Math.round(days), status: "Received", isSelected: name === priced[0][0] } });
        mqCount++;
      }
    }
    // current version: the won one, else the latest open one, else the latest
    const open = ["New Request", "Qualifying", "Preparing Proposal", "Proposal Sent", "High Probability"];
    const current = made.find((m) => m.status === "DVT Won") ?? [...made].reverse().find((m) => open.includes(m.status)) ?? made[made.length - 1];
    if (current) await prisma.proposal.update({ where: { id: proposal.id }, data: { currentVersionId: current.id } });
  }

  // ---------- Acquisition quotes (Vendor 1/2/3 columns -> rows) ----------
  let aqCount = 0;
  for (const r of daq) {
    const legacy = parseLegacyId(r._first)!;
    const versionId = versionByLegacy.get(legacy.raw);
    if (!versionId) { warn(`Acquisition row ${legacy.raw}: proposal not found in Proposals sheet — skipped`); continue; }
    await prisma.proposalVersion.update({
      where: { id: versionId },
      data: { gsdCm: n(r, "GSD (cm)"), lidarPpsm: n(r, "LiDAR PPSM"), flightAcres: n(r, "Flight Acres") },
    });
    const likely = n(r, "Likely Acq Vendor (1, 2 or 3)");
    const sensorType = s(r, "Sensor(s) Type");
    for (const i of [1, 2, 3]) {
      const name = s(r, i === 1 ? "Acqusition Vendor 1" : `Acquisition Vendor ${i}`, `Acqusition Vendor ${i}`);
      if (isNA(name)) continue;
      const vendor = await company(name!, { isAcqVendor: true });
      const sensorName = s(r, `Vendor ${i} Sensor(s)`);
      const cost = n(r, `Vendor ${i} Cost`);
      await prisma.acquisitionQuote.create({
        data: {
          versionId, vendorId: vendor.id, cost,
          sensorId: isNA(sensorName) ? null : await sensor(vendor.id, sensorName!, sensorType),
          frameCount: n(r, `Vendor ${i} Frame Count`) == null ? null : Math.round(n(r, `Vendor ${i} Frame Count`)!),
          status: cost != null ? "Received" : "Requested", isSelected: likely === i,
          comments: i === 1 ? s(r, "Data Acquisition Comments") : null,
        },
      });
      aqCount++;
    }
  }

  // ---------- Projects (Jobs + Projects sheets merged by project #) ----------
  const merged = new Map<string, { job?: Row; proj?: Row & { _status: string } }>();
  for (const r of jobs) { const k = String(r._first).trim(); merged.set(k, { ...merged.get(k), job: r }); }
  for (const r of projs) { const k = String(r._first).trim(); merged.set(k, { ...merged.get(k), proj: r }); }
  const created = new Map<string, string>();
  let prCount = 0;
  // parents before add-ons
  const numbers = [...merged.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const num of numbers) {
    if (await prisma.project.findUnique({ where: { number: num } })) { warn(`Project ${num} already exists — skipped`); continue; }
    const { job, proj } = merged.get(num)!;
    const link = proposalByProjectNo.get(num);
    const clientName = (proj && s(proj, "Client")) ?? null;
    const clientId = clientName ? (await company(clientName, { isClient: true })).id : link?.companyId;
    if (!clientId) { warn(`Project ${num}: client unknown — skipped`); continue; }
    const acqName = (job && s(job, "Acqusition Vendor", "Acquisition Vendor")) ?? (proj ? s(proj, "Data Acquisition Vendor")?.split(" - ")[0] ?? null : null);
    const procName = (job && s(job, "Processing Vendor")) ?? (proj && s(proj, "BPS/ED"));
    const pm = (proj && s(proj, "PM")) ?? (job && s(job, "Who Created"));
    const addOn = num.match(/^(.+)-(\d+)$/);
    const parentId = addOn ? created.get(addOn[1]) ?? (await prisma.project.findUnique({ where: { number: addOn[1] } }))?.id ?? null : null;
    const lat = proj ? parseDms(s(proj, "LAT")) : null;
    const lon = proj ? parseDms(s(proj, "LONG")) : null;
    const status = proj?._status ?? (job && s(job, "DVT Invoice #") ? "Completed" : "Awarded");
    const data: Prisma.ProjectUncheckedCreateInput = {
      number: num,
      name: (proj && s(proj, "Project Name")) ?? (job && s(job, "Project Name [Client - Project Name - State]", "Project Name")) ?? num,
      companyId: clientId, proposalId: link?.proposalId ?? null, versionId: link?.versionId ?? null,
      parentProjectId: parentId, addOnSeq: addOn ? Number(addOn[2]) : null,
      dvtPmId: pm && !isNA(pm) ? await pmUser(pm) : null,
      acquisitionMethod: (job && s(job, "Plane Drone Other")) ?? methodFromNumber(num),
      status,
      pidOrTargets: proj ? s(proj, "PID/Target") : null,
      latitude: lat, longitude: lon,
      acres: proj ? n(proj, "Acres") : job ? n(job, "Acres") : null,
      projectType: proj ? s(proj, "Project Type") : null, sensorType: proj ? s(proj, "Sensor(s)") : null,
      deliverables: proj ? s(proj, "Project Deliverables") : null,
      comments: [proj && s(proj, "Status"), job && s(job, "Comments")].filter(Boolean).join("\n") || null,
      clientPoJob: job ? s(job, "Client's PO - Job Number") : null,
      invoiceNumbers: job ? s(job, "DVT Invoice #") : null,
      contractValue: job ? n(job, "Project Value - To Be Billed") || n(job, "Project Value - Billed Amount") : null,
      billedAmount: job ? n(job, "Project Value - Billed Amount") : null,
      acqVendorId: acqName && !isNA(acqName) ? (await company(acqName, { isAcqVendor: true })).id : null,
      acqCost: job ? n(job, "Acqusition Cost", "Acquisition Cost") : null,
      processingVendorId: procName && !isNA(procName) ? (await company(procName, { isMappingVendor: true })).id : null,
      processingCost: job ? n(job, "Processing Cost") : null,
      mobCosts: job ? n(job, "DVT Mob Costs") : null,
      invoicePaid: job ? /^paid$/i.test(s(job, "Invoice Paid/Unpaid") ?? "") : false,
      awardDate: (proj && d(proj, "Award Date")) ?? (job && d(job, "Date Created")),
      scheduledClientDelivery: proj ? d(proj, "Scheduled Client Delivery Date") : null,
      acqVendorNtp: proj ? d(proj, "Acquisition Vendor NTP Date") : null,
      dateFlown: proj ? d(proj, "Date Flown") : null,
      controlOut: proj ? d(proj, "Control Out") : null,
      controlIn: proj ? d(proj, "Control In") : null,
      controlToFlightProvider: proj ? d(proj, "Control to flight provider") : null,
      imageryIn: proj ? d(proj, "Imagery In") : null,
      lidarIn: proj ? d(proj, "LiDAR In") : null,
      acqDataQc: proj ? d(proj, "Acquisition Vendor Data QC") : null,
      sentToSub: proj ? d(proj, "Date Sent to Sub") : null,
      atIn: proj ? d(proj, "AT In") : null,
      atApproved: proj ? d(proj, "AT Approved") : null,
      orthoIn: proj ? d(proj, "Ortho In Actual Date") : null,
      mappingIn: proj ? d(proj, "Mapping In Actual Date") : null,
      subDeliveryPromised: proj ? d(proj, "Sub Delivery Date Promised") : null,
      actualClientDelivery: proj ? d(proj, "Actual Client Delivery Date") : null,
      invoiceDate: job ? d(job, "Invoice Date") : null,
      paymentDate: job ? d(job, "Payment Date") : null,
    };
    const p = await prisma.project.create({ data: { ...data, statusHistory: { create: { toStatus: status } } } });
    created.set(num, p.id);
    prCount++;
  }
  // Proposals whose project is an add-on (-n) are add-on proposals of the parent project
  for (const [num, link] of proposalByProjectNo) {
    const m = num.match(/^(.+)-\d+$/);
    if (!m) continue;
    const parent = await prisma.project.findUnique({ where: { number: m[1] } });
    if (parent) await prisma.proposal.update({ where: { id: link.proposalId }, data: { opportunityType: "ADD_ON", parentProjectId: parent.id } });
    else warn(`Proposal for add-on ${num}: parent project ${m[1]} is not in the workbook — left as a new opportunity`);
  }
  await saveLists();

  console.log(`Imported: ${pCount} proposals, ${vCount} versions, ${aqCount} acquisition quotes, ${mqCount} mapping quotes, ${prCount} projects, ${companies.size} companies, ${users.size} DVT PM users.`);
  if (users.size) console.log("DVT PM users were created with placeholder emails (…@users.invalid). Set their names, emails and passwords in Admin → Users.");
  if (mqCount) console.log("Mapping quotes: where several mapping prices existed, the first (BPS) is marked Selected — review on each proposal.");
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings.slice(0, 50)) console.log(" - " + w);
    if (warnings.length > 50) console.log(` … and ${warnings.length - 50} more`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
