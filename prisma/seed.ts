/**
 * Seeds the admin user, default dropdown lists and settings.
 * With SEED_DEMO_DATA=true it also loads a small FICTIONAL data set
 * (made-up companies and proposals) so the app can be explored.
 * Real client data is loaded separately with `npm run import:workbook`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_LISTS: Record<string, string[]> = {
  PROJECT_TYPE: ["Solar", "Wind", "Elec T&D", "Pipeline", "Landfill", "Topo", "Topo Corridor", "Ortho", "Volume Calcs", "Airport", "Rail", "Sewer", "Quarry", "Mine", "Data Center", "Golf Course", "Other"],
  SENSOR_TYPE: ["Image", "LiDAR", "Image + LiDAR", "Drone Image", "Drone LiDAR", "Drone Image + LiDAR", "Mobile LiDAR", "Bathy", "Terrestrial Scan", "Other"],
  DELIVERABLE: ["AT/Plan/Topo", "AT only", "Topo only", "Plan only", "Plan + Topo", "2D Plan", "3D Plan", "Orthos", "Stockpile Volumes", "Tree Heights", "Flight Only", "PLSCADD", "Ground Classification", "Topo-Bathy", "Other"],
  VENDOR_TYPE: ["Manned", "Drone", "Mobile", "Scanning", "Processing"],
  DOC_FOLDER: ["a. Proposal", "b. Work Order - Project Specs", "c. Project Limits", "d. Ground Control", "e. Image Acquisition", "f. Processing", "g. QA - QC", "h. Client Deliveries", "i. Contracts", "j. Invoices", "k. FAA and Airspace", "l. Client Data"],
  PID_TARGETS: ["PID", "Targets", "NA"],
};

// Lists that must match a fixed standard exactly (other values are deactivated)
const EXACT_LISTS = ["DOC_FOLDER"];

async function seedLists() {
  for (const [list, values] of Object.entries(DEFAULT_LISTS)) {
    const exact = EXACT_LISTS.includes(list);
    for (const [i, value] of values.entries()) {
      await prisma.listItem.upsert({
        where: { list_value: { list, value } },
        create: { list, value, sortOrder: i + 1 },
        update: exact ? { sortOrder: i + 1, active: true } : {},
      });
    }
    if (exact) await prisma.listItem.updateMany({ where: { list, value: { notIn: values } }, data: { active: false } });
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const u = await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME ?? "Administrator", initials: "ADM", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Created admin ${email} (change the password after first sign-in).`);
  return u;
}

const day = (s: string) => new Date(`${s}T00:00:00Z`);

async function seedDemo(adminId: string) {
  if ((await prisma.company.count()) > 0) {
    console.log("Companies already exist — skipping demo data.");
    return;
  }
  const pmA = await prisma.user.create({ data: { email: "pm.one@example.com", name: "Demo PM One", initials: "PM1", passwordHash: await bcrypt.hash("DemoUser123!", 10) } });
  let code = 0;
  const co = (name: string, shortName: string, types: Partial<{ isClient: boolean; isProspect: boolean; isAcqVendor: boolean; isMappingVendor: boolean }>, extra: object = {}) =>
    prisma.company.create({ data: { code: `C${String(++code).padStart(4, "0")}`, name, shortName, ...types, ...extra } });

  const northwind = await co("Northwind Engineering Inc.", "Northwind", { isClient: true }, { city: "Ann Arbor", state: "MI" });
  const summit = await co("Summit Civil Group", "Summit", { isClient: true }, { city: "Columbus", state: "OH" });
  const harbor = await co("Harbor Renewables LLC", "Harbor", { isProspect: true }, { city: "Austin", state: "TX" });
  const skyhigh = await co("SkyHigh Aerial Survey", "SkyHigh", { isAcqVendor: true }, { vendorType: "Manned" });
  const falcon = await co("Falcon Flight Services", "Falcon", { isAcqVendor: true, isClient: true }, { vendorType: "Manned" });
  const hover = await co("Hover Drone Ops", "Hover", { isAcqVendor: true }, { vendorType: "Drone" });
  const precision = await co("Precision Mapping Co.", "PMC-Demo", { isMappingVendor: true }, { vendorType: "Processing" });
  const vector = await co("Vector Photogrammetry", "Vector", { isMappingVendor: true }, { vendorType: "Processing" });

  const [nwPm, smPm] = await Promise.all([
    prisma.contact.create({ data: { companyId: northwind.id, firstName: "Alex", lastName: "Rivera", title: "Project Manager", email: "alex.rivera@example.com" } }),
    prisma.contact.create({ data: { companyId: summit.id, firstName: "Jordan", lastName: "Lee", title: "Survey Lead", email: "jordan.lee@example.com" } }),
    prisma.contact.create({ data: { companyId: harbor.id, firstName: "Sam", lastName: "Patel", title: "Development Manager" } }),
    prisma.contact.create({ data: { companyId: skyhigh.id, firstName: "Chris", lastName: "Morgan", title: "Flight Ops", location: "Detroit base" } }),
  ]);
  const s1 = await prisma.vendorSensor.create({ data: { companyId: skyhigh.id, name: "Riegl LiDAR + P1", sensorType: "Image + LiDAR" } });
  const s2 = await prisma.vendorSensor.create({ data: { companyId: falcon.id, name: "Optech LiDAR + UC", sensorType: "Image + LiDAR" } });
  await prisma.vendorSensor.create({ data: { companyId: falcon.id, name: "DMC III", sensorType: "Image" } });
  const s4 = await prisma.vendorSensor.create({ data: { companyId: hover.id, name: "DJI L2", sensorType: "Drone Image + LiDAR" } });

  const y = new Date().getUTCFullYear();
  const num = (n: number) => `${y}${String(n).padStart(5, "0")}`;

  // 1. Open proposal with two alternative versions (pipeline counts it once)
  const p1 = await prisma.proposal.create({
    data: {
      number: num(1), companyId: northwind.id, clientContactId: nwPm.id, dvtPmId: pmA.id, city: "Ypsilanti", state: "MI", createdById: adminId,
      versions: {
        create: [
          { versionNo: 1, code: `${num(1)}.1`, title: "Riverbend Solar - Full site", status: "Open/HIGH", requestDate: day(`${y}-01-12`), followUpDate: new Date(), proposalValue: 48500, internalCost: 1500, mappingAcres: 1850, flightAcres: 2100, gsdCm: 5, lidarPpsm: 20, projectType: "Solar", sensorType: "Image + LiDAR", deliverables: "AT/Plan/Topo" },
          { versionNo: 2, code: `${num(1)}.2`, title: "Riverbend Solar - Phase 1 only", status: "Open", requestDate: day(`${y}-01-12`), proposalValue: 31200, internalCost: 1200, mappingAcres: 980, flightAcres: 1100, gsdCm: 5, lidarPpsm: 20, projectType: "Solar", sensorType: "Image + LiDAR", deliverables: "AT/Plan/Topo" },
        ],
      },
    },
    include: { versions: true },
  });
  const [v11, v12] = p1.versions;
  await prisma.proposal.update({ where: { id: p1.id }, data: { currentVersionId: v11.id } });
  await prisma.acquisitionQuote.createMany({ data: [
    { versionId: v11.id, vendorId: skyhigh.id, sensorId: s1.id, cost: 14800, frameCount: 320, status: "Received", isSelected: true, quoteDate: day(`${y}-01-15`) },
    { versionId: v11.id, vendorId: falcon.id, sensorId: s2.id, cost: 16250, frameCount: 300, status: "Received", quoteDate: day(`${y}-01-16`) },
    { versionId: v11.id, vendorId: hover.id, sensorId: s4.id, status: "Declined", comments: "Site too large for UAV" },
    { versionId: v12.id, vendorId: skyhigh.id, sensorId: s1.id, cost: 9800, frameCount: 170, status: "Received", isSelected: true },
  ] });
  await prisma.mappingQuote.createMany({ data: [
    { versionId: v11.id, vendorId: precision.id, cost: 9200, days: 14, status: "Received", isSelected: true },
    { versionId: v11.id, vendorId: vector.id, cost: 10400, days: 10, status: "Received" },
    { versionId: v12.id, vendorId: precision.id, cost: 5600, days: 10, status: "Received", isSelected: true },
  ] });
  await prisma.note.create({ data: { proposalId: p1.id, type: "Call", body: "Client expects a decision by end of month; phase 1 may go first.", userId: pmA.id, contactId: nwPm.id } });

  // 2. Won proposal -> project
  const p2 = await prisma.proposal.create({
    data: {
      number: num(2), companyId: summit.id, clientContactId: smPm.id, dvtPmId: pmA.id, city: "Delaware", state: "OH", createdById: adminId,
      versions: { create: [{ versionNo: 1, code: `${num(2)}.1`, title: "Route 23 Corridor", status: "DVT Won", requestDate: day(`${y}-02-03`), proposalValue: 22900, internalCost: 800, mappingAcres: 260, isLinear: true, linearMiles: 6.5, linearWidthFt: 400, projectType: "Topo Corridor", sensorType: "Image + LiDAR", deliverables: "AT/Plan/Topo" }] },
    },
    include: { versions: true },
  });
  await prisma.proposal.update({ where: { id: p2.id }, data: { currentVersionId: p2.versions[0].id } });
  await prisma.acquisitionQuote.create({ data: { versionId: p2.versions[0].id, vendorId: falcon.id, sensorId: s2.id, cost: 7400, status: "Received", isSelected: true } });
  await prisma.mappingQuote.create({ data: { versionId: p2.versions[0].id, vendorId: vector.id, cost: 4100, days: 12, status: "Received", isSelected: true } });
  const yymm = `${String(y).slice(2)}02`;
  await prisma.project.create({
    data: {
      number: `${yymm}1801P`, name: "Route 23 Corridor", companyId: summit.id, clientContactId: smPm.id, dvtPmId: pmA.id, proposalId: p2.id, versionId: p2.versions[0].id,
      acquisitionMethod: "Plane", status: "Production", city: "Delaware", state: "OH", acres: 260, linearMiles: 6.5, projectType: "Topo Corridor", sensorType: "Image + LiDAR", deliverables: "AT/Plan/Topo",
      contractValue: 22900, acqVendorId: falcon.id, acqCost: 7400, processingVendorId: vector.id, processingCost: 4100, mobCosts: 800,
      awardDate: day(`${y}-02-20`), acqVendorNtp: day(`${y}-02-24`), dateFlown: day(`${y}-03-02`), imageryIn: day(`${y}-03-06`), lidarIn: day(`${y}-03-07`), sentToSub: day(`${y}-03-09`), subDeliveryPromised: day(`${y}-03-23`),
      scheduledClientDelivery: day(`${y}-03-31`), pidOrTargets: "Targets",
      statusHistory: { create: [{ toStatus: "Awarded", userId: pmA.id }, { fromStatus: "Awarded", toStatus: "Production", userId: pmA.id }] },
    },
  });

  // 3. Prospect proposal still being priced
  await prisma.proposal.create({
    data: {
      number: num(3), companyId: harbor.id, dvtPmId: pmA.id, city: "Lockhart", state: "TX", createdById: adminId,
      versions: { create: [{ versionNo: 1, code: `${num(3)}.1`, title: "Cedar Creek Wind", status: "Preparing Proposal", requestDate: new Date(), mappingAcres: 12000, projectType: "Wind", sensorType: "Image", deliverables: "2D Plan" }] },
    },
  });
  await prisma.counter.upsert({ where: { key: `proposal-${y}` }, create: { key: `proposal-${y}`, value: 3 }, update: { value: 3 } });
  console.log("Loaded fictional demo data (3 proposals, 1 project). Demo PM login: pm.one@example.com / DemoUser123!");
}

async function main() {
  await seedLists();
  const admin = await seedAdmin();
  if (process.env.SEED_DEMO_DATA === "true") await seedDemo(admin.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
