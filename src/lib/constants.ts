/** Single opportunity status (replaces the old Odds + Won/Lost pair). */
export const VERSION_STATUSES = [
  "New Request",
  "Qualifying",
  "Preparing Proposal",
  "Proposal Sent",
  "High Probability",
  "DVT Won",
  "Client Lost",
  "Client Won/DVT Lost",
  "On Hold",
  "Abandoned",
  "Cancelled",
] as const;

export const OPEN_STATUSES = ["New Request", "Qualifying", "Preparing Proposal", "Proposal Sent", "High Probability"] as const;
/** The main path a proposal moves along (closed outcomes are separate). */
export const PIPELINE_STAGES = ["New Request", "Qualifying", "Preparing Proposal", "Proposal Sent", "High Probability", "DVT Won"] as const;
export const CLOSED_STATUSES = ["Client Lost", "Client Won/DVT Lost", "On Hold", "Abandoned", "Cancelled"] as const;
export const WON_STATUS = "DVT Won";

export const PROJECT_STATUSES = [
  "Awarded",
  "Acquisition",
  "Production",
  "Ready for Invoicing",
  "On Hold",
  "Completed",
  "Cancelled",
] as const;

export const ACTIVE_PROJECT_STATUSES = ["Awarded", "Acquisition", "Production", "Ready for Invoicing"];

export const QUOTE_STATUSES = ["Requested", "Received", "Declined"] as const;

/** Acquisition method -> project number suffix. */
export const ACQUISITION_METHODS: Record<string, string> = {
  Plane: "P",
  Drone: "D",
  Mobile: "M",
  Scanner: "S",
  Other: "O",
};

export const NOTE_TYPES = ["Note", "Call", "Email", "Video Meeting", "In Person", "Follow-up"] as const;

/** Dropdown lists editable by admins. */
export const LISTS = {
  PROJECT_TYPE: "Project Type",
  SENSOR_TYPE: "Sensor Type",
  DELIVERABLE: "Project Deliverables",
  VENDOR_TYPE: "Vendor Type",
  DOC_FOLDER: "Document Folder",
  PID_TARGETS: "PID or Targets",
} as const;
export type ListKey = keyof typeof LISTS;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export const PIPELINE_RULES = {
  CURRENT: "Current version (recommended)",
  MAX: "Highest open version",
  MIN: "Lowest open version",
  AVERAGE: "Average of open versions",
  MEDIAN: "Median of open versions",
  LATEST: "Latest open version",
} as const;
export type PipelineRule = keyof typeof PIPELINE_RULES;
