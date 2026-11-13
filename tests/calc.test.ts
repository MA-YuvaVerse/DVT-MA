import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalPipeline, proposalStatus, versionCosting, versionProbability, projectMargin, DEFAULT_PROBABILITY } from "../src/lib/calc";

const today = new Date("2026-11-13T00:00:00Z");
const v = (versionNo: number, status: string, proposalValue: number | null, requestDate = new Date("2026-11-01T00:00:00Z")) => ({ versionNo, status, proposalValue, requestDate });

test("pipeline never sums versions", () => {
  const vs = [v(1, "Open", 80000), v(2, "Open", 60000)];
  assert.equal(proposalPipeline(vs, "MAX", DEFAULT_PROBABILITY, today).value, 80000);
  assert.equal(proposalPipeline(vs, "MIN", DEFAULT_PROBABILITY, today).value, 60000);
  assert.equal(proposalPipeline(vs, "AVERAGE", DEFAULT_PROBABILITY, today).value, 70000);
  assert.equal(proposalPipeline(vs, "LATEST", DEFAULT_PROBABILITY, today).value, 60000);
  assert.equal(proposalPipeline([...vs, v(3, "Open", 70000)], "MEDIAN", DEFAULT_PROBABILITY, today).value, 70000);
});

test("closed versions are excluded from pipeline", () => {
  const p = proposalPipeline([v(1, "Cancelled", 90000), v(2, "Open", 10000), v(3, "DVT Won", 50000)], "MAX", DEFAULT_PROBABILITY, today);
  assert.equal(p.value, 10000);
  assert.equal(p.openVersions, 1);
  assert.equal(proposalPipeline([v(1, "DVT Won", 5)], "MAX", DEFAULT_PROBABILITY, today).value, 0);
});

test("probability: open 40, high 75, stale open 15", () => {
  assert.equal(versionProbability(v(1, "Open", 1), DEFAULT_PROBABILITY, today), 40);
  assert.equal(versionProbability(v(1, "Open/HIGH", 1), DEFAULT_PROBABILITY, today), 75);
  assert.equal(versionProbability(v(1, "Open", 1, new Date("2026-09-01T00:00:00Z")), DEFAULT_PROBABILITY, today), 15);
  assert.equal(versionProbability(v(1, "Client Lost", 1), DEFAULT_PROBABILITY, today), 0);
  const p = proposalPipeline([v(1, "Open/HIGH", 10000)], "MAX", DEFAULT_PROBABILITY, today);
  assert.equal(p.weighted, 7500);
});

test("costing uses selected quotes only and guards divide-by-zero", () => {
  const c = versionCosting({
    versionNo: 1, status: "Open", proposalValue: 12500, internalCost: 500, mappingAcres: 250, flightAcres: 0,
    acqQuotes: [{ cost: 4200, isSelected: true }, { cost: 3100, isSelected: false }],
    mappingQuotes: [{ cost: 2600, isSelected: true }],
  });
  assert.equal(c.totalCost, 7300);
  assert.equal(c.margin, 5200);
  assert.equal(c.marginPct, 5200 / 12500);
  assert.equal(c.pricePerAcre, 50);
  const z = versionCosting({ versionNo: 1, status: "Open", proposalValue: null, mappingAcres: 0 });
  assert.equal(z.margin, null);
  assert.equal(z.pricePerAcre, null);
});

test("roll-up status prefers won, then open", () => {
  assert.equal(proposalStatus([{ status: "Cancelled" }, { status: "DVT Won" }]), "DVT Won");
  assert.equal(proposalStatus([{ status: "Abandoned" }, { status: "Open" }]), "Open");
  assert.equal(proposalStatus([{ status: "Client Lost" }, { status: "Abandoned" }]), "Client Lost");
});

test("project margin", () => {
  const m = projectMargin({ contractValue: 15000, acqCost: 6000, processingCost: 1000, mobCosts: null });
  assert.equal(m.margin, 8000);
});

test("margin is unknown until a cost is entered", () => {
  const c = versionCosting({ versionNo: 1, status: "Open", proposalValue: 15000 });
  assert.equal(c.margin, null);
  assert.equal(c.marginPct, null);
});
