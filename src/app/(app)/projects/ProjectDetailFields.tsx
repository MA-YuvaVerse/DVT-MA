import { ACQUISITION_METHODS, US_STATES } from "@/lib/constants";
import { toNum } from "@/lib/format";
import { CompanyContactPicker } from "@/components/client";
import { Field, Select } from "@/components/ui";

type Opt = { value: string; label: string; group?: string };

export function ProjectDetailFields({ p, clients, contacts, users, lists }: {
  p?: { name: string; companyId: string; clientContactId: string | null; dvtPmId: string | null; acquisitionMethod: string | null; pidOrTargets: string | null; city: string | null; state: string | null; latitude: number | null; longitude: number | null; acres: unknown; linearMiles: unknown; projectType: string | null; sensorType: string | null; deliverables: string | null; folderUrl: string | null; comments: string | null };
  clients: Opt[]; contacts: Opt[]; users: Opt[];
  lists: { projectType: string[]; sensorType: string[]; deliverables: string[]; pid: string[] };
}) {
  const n = (x: unknown) => toNum(x) ?? "";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Project name *" className="sm:col-span-2"><input name="name" className="input" required defaultValue={p?.name ?? ""} /></Field>
      <CompanyContactPicker companies={clients} contacts={contacts} companyId={p?.companyId} contactId={p?.clientContactId} required />
      <Field label="DVT PM"><Select name="dvtPmId" options={users} value={p?.dvtPmId} /></Field>
      <Field label="Acquisition method"><Select name="acquisitionMethod" options={Object.keys(ACQUISITION_METHODS)} value={p?.acquisitionMethod} /></Field>
      <Field label="PID or targets"><Select name="pidOrTargets" options={lists.pid} value={p?.pidOrTargets} /></Field>
      <Field label="Project type"><Select name="projectType" options={lists.projectType} value={p?.projectType} /></Field>
      <Field label="Sensor type"><Select name="sensorType" options={lists.sensorType} value={p?.sensorType} /></Field>
      <Field label="Deliverables"><Select name="deliverables" options={lists.deliverables} value={p?.deliverables} /></Field>
      <Field label="Acres"><input name="acres" className="input" inputMode="decimal" defaultValue={n(p?.acres)} /></Field>
      <Field label="Linear miles"><input name="linearMiles" className="input" inputMode="decimal" defaultValue={n(p?.linearMiles)} /></Field>
      <Field label="City"><input name="city" className="input" defaultValue={p?.city ?? ""} /></Field>
      <Field label="State"><Select name="state" options={US_STATES} value={p?.state} /></Field>
      <Field label="Latitude"><input name="latitude" className="input" inputMode="decimal" defaultValue={p?.latitude ?? ""} /></Field>
      <Field label="Longitude"><input name="longitude" className="input" inputMode="decimal" defaultValue={p?.longitude ?? ""} /></Field>
      <Field label="Project folder link" className="sm:col-span-2"><input name="folderUrl" type="url" className="input" defaultValue={p?.folderUrl ?? ""} /></Field>
      <Field label="Status comments" className="sm:col-span-2 lg:col-span-4"><textarea name="comments" rows={2} className="input" defaultValue={p?.comments ?? ""} /></Field>
    </div>
  );
}
