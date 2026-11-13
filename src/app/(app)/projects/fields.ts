/** Milestone date fields on a project, in workflow order. */
export const MILESTONES = [
  ["awardDate", "Award date"],
  ["acqVendorNtp", "Acq vendor NTP"],
  ["controlOut", "Control out"],
  ["dateFlown", "Date flown"],
  ["controlIn", "Control in"],
  ["controlToFlightProvider", "Control to flight provider"],
  ["imageryIn", "Imagery in"],
  ["lidarIn", "LiDAR in"],
  ["acqDataQc", "Acq vendor data QC"],
  ["sentToSub", "Sent to mapping sub"],
  ["atIn", "AT in"],
  ["atApproved", "AT approved"],
  ["orthoIn", "Ortho in"],
  ["mappingIn", "Mapping in"],
  ["subDeliveryPromised", "Sub delivery promised"],
  ["scheduledClientDelivery", "Scheduled client delivery"],
  ["actualClientDelivery", "Actual client delivery"],
  ["invoiceDate", "Invoice date"],
  ["paymentDate", "Payment date"],
] as const;
export type MilestoneKey = (typeof MILESTONES)[number][0];

/** Throughput intervals reported in days. */
export const DURATIONS: [string, MilestoneKey, MilestoneKey][] = [
  ["Award → flown", "awardDate", "dateFlown"],
  ["Flown → imagery in", "dateFlown", "imageryIn"],
  ["Flown → LiDAR in", "dateFlown", "lidarIn"],
  ["Imagery in → sent to sub", "imageryIn", "sentToSub"],
  ["Sent to sub → AT in", "sentToSub", "atIn"],
  ["Sent to sub → mapping in", "sentToSub", "mappingIn"],
  ["Sub promised vs delivered", "subDeliveryPromised", "mappingIn"],
  ["Mapping in → client delivery", "mappingIn", "actualClientDelivery"],
  ["Award → client delivery", "awardDate", "actualClientDelivery"],
  ["Flown → client delivery", "dateFlown", "actualClientDelivery"],
  ["Delivery → payment", "actualClientDelivery", "paymentDate"],
];
