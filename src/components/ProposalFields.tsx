import { US_STATES, VERSION_STATUSES } from "@/lib/constants";
import { dateInput, toNum } from "@/lib/format";
import { CompanyContactPicker, OpportunityTypePicker, Toggle } from "./client";
import { Field, Select } from "./ui";

type Opt = { value: string; label: string; group?: string };

export function ProposalHeaderFields({ p, clients, contacts, users, projects }: {
  p?: { companyId: string; clientContactId: string | null; dvtPmId: string | null; opportunityType: string; parentProjectId: string | null; city: string | null; state: string | null; latitude: number | null; longitude: number | null; folderUrl: string | null; comments: string | null };
  clients: Opt[];
  contacts: Opt[];
  users: Opt[];
  projects: Opt[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CompanyContactPicker companies={clients} contacts={contacts} companyId={p?.companyId} contactId={p?.clientContactId} required />
      <Field label="DVT PM"><Select name="dvtPmId" options={users} value={p?.dvtPmId} /></Field>
      <OpportunityTypePicker value={p?.opportunityType ?? "NEW"} projects={projects} parentProjectId={p?.parentProjectId} />
      <Field label="City"><input name="city" className="input" defaultValue={p?.city ?? ""} /></Field>
      <Field label="State"><Select name="state" options={US_STATES} value={p?.state} /></Field>
      <Field label="Proposal folder link" className="sm:col-span-2"><input name="folderUrl" type="url" className="input" defaultValue={p?.folderUrl ?? ""} placeholder="https://drive.google.com/drive/folders/…" /></Field>
      <MoreDetails>
        <Field label="Latitude"><input name="latitude" className="input" inputMode="decimal" defaultValue={p?.latitude ?? ""} placeholder="42.6259" /></Field>
        <Field label="Longitude"><input name="longitude" className="input" inputMode="decimal" defaultValue={p?.longitude ?? ""} placeholder="-83.6166" /></Field>
        <Field label="Proposal comments" className="sm:col-span-2"><textarea name="comments" rows={1} className="input" defaultValue={p?.comments ?? ""} /></Field>
      </MoreDetails>
    </div>
  );
}

type V = {
  title: string; status: string; requestDate: Date | null; dueDate: Date | null; lastClientContactDate: Date | null; followUpDate: Date | null;
  proposalValue: unknown; mappingAcres: unknown; flightAcres: unknown; isLinear: boolean; linearMiles: unknown; linearWidthFt: unknown;
  gsdCm: unknown; lidarPpsm: unknown; gcpCount?: number | null; projectType: string | null; sensorType: string | null; deliverables: string | null; comments: string | null;
};

/** Collapsed block for optional fields; inputs inside are still submitted with the form. */
export function MoreDetails({ children, label = "More details (optional)" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="sm:col-span-2 lg:col-span-4">
      <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">{label}</summary>
      <div className="mt-2 grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </details>
  );
}

/**
 * Scope fields of a version.
 * mode "request": the few fields needed to log a new proposal request.
 * mode "full": the working fields; rarely used ones sit under "More details".
 */
export function VersionScopeFields({ v, lists, statusLocked, mode = "full" }: { v?: V; lists: { projectType: string[]; sensorType: string[]; deliverables: string[] }; statusLocked?: boolean; mode?: "request" | "full" }) {
  const n = (x: unknown) => toNum(x) ?? "";
  const statuses = VERSION_STATUSES.filter((s) => s !== "DVT Won" || v?.status === "DVT Won");
  if (mode === "request") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Project name *" className="sm:col-span-2"><input name="title" className="input" required placeholder="e.g. Riverbend Solar" /></Field>
        <Field label="Request date"><input type="date" name="requestDate" className="input" defaultValue={dateInput(new Date())} /></Field>
        <Field label="Due date"><input type="date" name="dueDate" className="input" /></Field>
        <Field label="Project type"><Select name="projectType" options={lists.projectType} /></Field>
        <Field label="Deliverables"><Select name="deliverables" options={lists.deliverables} /></Field>
        <Field label="Approx. acres"><input name="mappingAcres" className="input" inputMode="decimal" /></Field>
        <Field label="Follow-up date"><input type="date" name="followUpDate" className="input" /></Field>
        <Field label="What the client is asking for" className="sm:col-span-2 lg:col-span-4"><textarea name="versionComments" rows={2} className="input" placeholder="Location, deliverables, timeline, anything from the inquiry email…" /></Field>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Project name *" className="sm:col-span-2"><input name="title" className="input" required defaultValue={v?.title ?? ""} /></Field>
      <Field label="Stage" hint={statusLocked ? "Set by the award; project exists" : undefined}>
        <Select name={statusLocked ? "_status" : "status"} options={statuses as unknown as string[]} value={v?.status ?? "New Request"} disabled={statusLocked} />
        {statusLocked && <input type="hidden" name="status" value={v?.status} />}
      </Field>
      <Field label="Proposal value ($)" hint="What DVT quotes the client"><input name="proposalValue" className="input" inputMode="decimal" defaultValue={n(v?.proposalValue)} /></Field>
      <Field label="Request date"><input type="date" name="requestDate" className="input" defaultValue={dateInput(v?.requestDate ?? null)} /></Field>
      <Field label="Due date"><input type="date" name="dueDate" className="input" defaultValue={dateInput(v?.dueDate ?? null)} /></Field>
      <Field label="Follow-up date"><input type="date" name="followUpDate" className="input" defaultValue={dateInput(v?.followUpDate ?? null)} /></Field>
      <Field label="Project type"><Select name="projectType" options={lists.projectType} value={v?.projectType} /></Field>
      <Field label="Sensor type"><Select name="sensorType" options={lists.sensorType} value={v?.sensorType} /></Field>
      <Field label="Deliverables"><Select name="deliverables" options={lists.deliverables} value={v?.deliverables} /></Field>
      <Field label="Mapping acres"><input name="mappingAcres" className="input" inputMode="decimal" defaultValue={n(v?.mappingAcres)} /></Field>
      <Field label="Flight acres"><input name="flightAcres" className="input" inputMode="decimal" defaultValue={n(v?.flightAcres)} /></Field>
      <Field label="# GCPs / targets"><input name="gcpCount" className="input" inputMode="numeric" defaultValue={n(v?.gcpCount)} /></Field>
      <Toggle name="isLinear" label="Linear project (corridor)" defaultChecked={v?.isLinear}>
        <Field label="Linear miles"><input name="linearMiles" className="input" inputMode="decimal" defaultValue={n(v?.linearMiles)} /></Field>
        <Field label="Corridor width (ft)"><input name="linearWidthFt" className="input" inputMode="decimal" defaultValue={n(v?.linearWidthFt)} /></Field>
      </Toggle>
      <Field label="Comments" className="sm:col-span-2 lg:col-span-4"><textarea name="versionComments" rows={2} className="input" defaultValue={v?.comments ?? ""} /></Field>
      <MoreDetails>
        <Field label="Last client contact"><input type="date" name="lastClientContactDate" className="input" defaultValue={dateInput(v?.lastClientContactDate ?? null)} /></Field>
        <Field label="GSD (cm)"><input name="gsdCm" className="input" inputMode="decimal" defaultValue={n(v?.gsdCm)} /></Field>
        <Field label="LiDAR PPSM"><input name="lidarPpsm" className="input" inputMode="decimal" defaultValue={n(v?.lidarPpsm)} /></Field>
      </MoreDetails>
    </div>
  );
}
