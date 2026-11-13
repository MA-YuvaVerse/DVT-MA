import { US_STATES } from "@/lib/constants";
import { Field, Select } from "@/components/ui";
import type { Company } from "@prisma/client";

export function CompanyFields({ c, vendorTypes }: { c?: Company; vendorTypes: string[] }) {
  const box = (name: keyof Company, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={!!c?.[name]} /> {label}</label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Company name *" className="sm:col-span-2"><input name="name" className="input" required defaultValue={c?.name ?? ""} /></Field>
      <Field label="Short name" hint="Shown in lists, e.g. an abbreviation"><input name="shortName" className="input" defaultValue={c?.shortName ?? ""} /></Field>
      <div className="pt-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c ? c.active : true} /> Active</label></div>
      <div className="sm:col-span-2 lg:col-span-4">
        <div className="label">Company type (pick all that apply) *</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {box("isClient", "Client")}{box("isProspect", "Prospect")}{box("isAcqVendor", "Acquisition vendor")}{box("isMappingVendor", "Mapping vendor")}
        </div>
      </div>
      <Field label="Vendor type"><Select name="vendorType" options={vendorTypes} value={c?.vendorType} /></Field>
      <Field label="Phone"><input name="phone" className="input" defaultValue={c?.phone ?? ""} /></Field>
      <Field label="Website"><input name="website" className="input" defaultValue={c?.website ?? ""} /></Field>
      <Field label="Address"><input name="address" className="input" defaultValue={c?.address ?? ""} /></Field>
      <Field label="City"><input name="city" className="input" defaultValue={c?.city ?? ""} /></Field>
      <Field label="State"><Select name="state" options={US_STATES} value={c?.state} /></Field>
      <Field label="QuickBooks customer ID"><input name="qboCustomerId" className="input" defaultValue={c?.qboCustomerId ?? ""} /></Field>
      <Field label="QuickBooks vendor ID"><input name="qboVendorId" className="input" defaultValue={c?.qboVendorId ?? ""} /></Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-4"><textarea name="notes" rows={2} className="input" defaultValue={c?.notes ?? ""} /></Field>
    </div>
  );
}
