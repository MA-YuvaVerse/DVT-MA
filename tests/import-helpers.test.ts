import { test } from "node:test";
import assert from "node:assert/strict";
import { mapLegacyStatus, methodFromNumber, parseCityState, parseDms, parseLegacyId, projectGroupStatus } from "../src/lib/import-helpers";

test("legacy proposal ids", () => {
  assert.deepEqual(parseLegacyId(2600123.1), { base: "2600123", suffix: 1, raw: "2600123.1" });
  assert.deepEqual(parseLegacyId(2600123), { base: "2600123", suffix: 0, raw: "2600123.0" });
  assert.deepEqual(parseLegacyId("2600456.1"), { base: "2600456", suffix: 1, raw: "2600456.1" });
  assert.equal(parseLegacyId("GROUP #1"), null);
  assert.equal(parseLegacyId(null), null);
});

test("legacy status mapping", () => {
  assert.equal(mapLegacyStatus("Won", "DVT Won"), "DVT Won");
  assert.equal(mapLegacyStatus("High", null), "High Probability");
  assert.equal(mapLegacyStatus("Suspended", null), "On Hold");
  assert.equal(mapLegacyStatus("Abandoned", "Option Not Considered"), "Cancelled");
  assert.equal(mapLegacyStatus("Abandoned", "Client Lost"), "Client Lost");
  assert.equal(mapLegacyStatus("Lost", "Client Won/DVT Lost"), "Client Won/DVT Lost");
  assert.equal(mapLegacyStatus("Abandoned", null), "Abandoned");
});

test("city/state, coordinates, groups, method", () => {
  assert.deepEqual(parseCityState("Lake Town MI"), { city: "Lake Town", state: "MI" });
  assert.deepEqual(parseCityState("AL & SC"), { city: "AL & SC", state: null });
  assert.equal(parseDms(` 40°30'00"N`), 40.5);
  assert.equal(parseDms(` 85°15'36"W`), -85.26);
  assert.equal(projectGroupStatus("GROUP #1 - IN PRODUCTION - QA/QC"), "Production");
  assert.equal(projectGroupStatus("GROUP #3 - PROJECT AWARDED but Not Yet Flown/Acquired"), "Awarded");
  assert.equal(projectGroupStatus("Delivered to Client and Ready for Invoicing"), "Ready for Invoicing");
  assert.equal(projectGroupStatus("COMPLETED PROJECTS"), "Completed");
  assert.equal(methodFromNumber("26019901M"), "Mobile");
  assert.equal(methodFromNumber("26019902P-1"), "Plane");
});
