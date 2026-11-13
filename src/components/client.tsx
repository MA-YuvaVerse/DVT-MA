"use client";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { error?: string; ok?: string } | undefined;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/** Form bound to a server action that shows its error / success message. */
export function ActionForm({ action, children, className, resetOnSuccess = false }: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = "btn-primary", pendingText = "Saving…", confirm }: { children: ReactNode; className?: string; pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

type Opt = { value: string; label: string; group?: string };

/** Company select + dependent contact select (contacts filtered by company). */
export function CompanyContactPicker({ companies, contacts, companyName = "companyId", contactName = "clientContactId", companyId, contactId, companyLabel = "Client", contactLabel = "Client PM", required }: {
  companies: Opt[];
  contacts: Opt[]; // group = companyId
  companyName?: string;
  contactName?: string;
  companyId?: string | null;
  contactId?: string | null;
  companyLabel?: string;
  contactLabel?: string;
  required?: boolean;
}) {
  const [cid, setCid] = useState(companyId ?? "");
  const list = useMemo(() => contacts.filter((c) => c.group === cid), [contacts, cid]);
  return (
    <>
      <div>
        <label className="label">{companyLabel}{required && " *"}</label>
        <select name={companyName} className="input" value={cid} required={required} onChange={(e) => setCid(e.target.value)}>
          <option value="">— select —</option>
          {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{contactLabel}</label>
        <select key={cid} name={contactName} className="input" defaultValue={contactId ?? ""}>
          <option value="">{cid ? (list.length ? "— select —" : "No contacts for this company") : "Select a company first"}</option>
          {list.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </>
  );
}

/** Vendor select + dependent sensor select (sensors the vendor owns). */
export function VendorSensorPicker({ vendors, sensors, vendorId, sensorId }: { vendors: Opt[]; sensors: Opt[]; vendorId?: string | null; sensorId?: string | null }) {
  const [vid, setVid] = useState(vendorId ?? "");
  const list = useMemo(() => sensors.filter((s) => s.group === vid), [sensors, vid]);
  return (
    <>
      <select name="vendorId" className="input" value={vid} required onChange={(e) => setVid(e.target.value)}>
        <option value="">— vendor —</option>
        {vendors.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>
      <select key={vid} name="sensorId" className="input" defaultValue={sensorId ?? ""}>
        <option value="">{list.length ? "— sensor —" : "No sensors on file"}</option>
        {list.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </>
  );
}

/** Shows children only while the checkbox is ticked (e.g. linear project fields). */
export function Toggle({ name, label, defaultChecked, children }: { name: string; label: string; defaultChecked?: boolean; children: ReactNode }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <>
      <label className="flex items-center gap-2 pt-5 text-sm">
        <input type="checkbox" name={name} checked={on} onChange={(e) => setOn(e.target.checked)} /> {label}
      </label>
      {on && children}
    </>
  );
}

/** Opportunity type select that reveals the parent project picker for add-ons. */
export function OpportunityTypePicker({ value, projects, parentProjectId }: { value: string; projects: Opt[]; parentProjectId?: string | null }) {
  const [t, setT] = useState(value);
  return (
    <>
      <div>
        <label className="label">Opportunity type</label>
        <select name="opportunityType" className="input" value={t} onChange={(e) => setT(e.target.value)}>
          <option value="NEW">New opportunity</option>
          <option value="ADD_ON">Add-on to existing project</option>
        </select>
      </div>
      {t === "ADD_ON" && (
        <div>
          <label className="label">Parent project *</label>
          <select name="parentProjectId" className="input" defaultValue={parentProjectId ?? ""} required>
            <option value="">— select project —</option>
            {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      )}
    </>
  );
}
