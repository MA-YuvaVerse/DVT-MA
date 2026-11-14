import type { AcquisitionQuote, MappingQuote } from "@prisma/client";
import { QUOTE_STATUSES } from "@/lib/constants";
import { dateInput, money, toNum } from "@/lib/format";
import { ActionForm, Submit, VendorSensorPicker } from "@/components/client";
import { deleteAcqQuote, deleteMappingQuote, saveAcqQuote, saveMappingQuote } from "../actions";

type Opt = { value: string; label: string; group?: string };

function StatusSelect({ value }: { value?: string }) {
  return (
    <select name="quoteStatus" className="input" defaultValue={value ?? "Requested"}>
      {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}

export function AcqQuoteRow({ versionId, q, vendors, sensors, acres }: { versionId: string; q?: AcquisitionQuote; vendors: Opt[]; sensors: Opt[]; acres: number | null }) {
  const isNew = !q;
  const cost = toNum(q?.cost);
  return (
    <div className={`rounded-md border p-2 md:border-0 md:p-0 ${isNew ? "border-dashed border-slate-300 bg-slate-50/60 md:bg-transparent" : "border-slate-200"} ${q?.isSelected ? "md:bg-emerald-50/50" : ""}`}>
      <div className="flex items-start gap-2">
        <ActionForm action={saveAcqQuote.bind(null, versionId, q?.id ?? null)} className="flex-1" resetOnSuccess={isNew}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.2fr_1.6fr_0.8fr_0.6fr_0.9fr_0.9fr_0.5fr_1.4fr_auto] md:items-center">
            <VendorSensorPicker vendors={vendors} sensors={sensors} vendorId={q?.vendorId} sensorId={q?.sensorId} />
            <input name="cost" className="input" inputMode="decimal" placeholder="Cost" defaultValue={cost ?? ""} title={cost && acres ? `${money(cost / acres, true)} per acre` : undefined} />
            <input name="frameCount" className="input" inputMode="numeric" placeholder="Frames" defaultValue={q?.frameCount ?? ""} />
            <input name="quoteDate" type="date" className="input" defaultValue={dateInput(q?.quoteDate ?? (isNew ? new Date() : null))} />
            <StatusSelect value={q?.status} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isSelected" defaultChecked={q?.isSelected} /> <span className="md:hidden">Final vendor</span></label>
            <input name="comments" className="input" placeholder="Comments" defaultValue={q?.comments ?? ""} />
            <Submit className={isNew ? "btn-primary btn-sm" : "btn-secondary btn-sm"} pendingText="…">{isNew ? "Add" : "Save"}</Submit>
          </div>
        </ActionForm>
        {q && (
          <form action={deleteAcqQuote.bind(null, q.id)} className="pt-0.5">
            <Submit className="btn-danger btn-sm" pendingText="…" confirm="Delete this quote?">✕</Submit>
          </form>
        )}
      </div>
    </div>
  );
}

export function MappingQuoteRow({ versionId, q, vendors, acres }: { versionId: string; q?: MappingQuote; vendors: Opt[]; acres: number | null }) {
  const isNew = !q;
  const cost = toNum(q?.cost);
  return (
    <div className={`rounded-md border p-2 md:border-0 md:p-0 ${isNew ? "border-dashed border-slate-300 bg-slate-50/60 md:bg-transparent" : "border-slate-200"} ${q?.isSelected ? "md:bg-emerald-50/50" : ""}`}>
      <div className="flex items-start gap-2">
        <ActionForm action={saveMappingQuote.bind(null, versionId, q?.id ?? null)} className="flex-1" resetOnSuccess={isNew}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_0.9fr_0.6fr_0.8fr_0.9fr_0.9fr_0.5fr_1.6fr_auto] md:items-center">
            <select name="vendorId" className="input" defaultValue={q?.vendorId ?? ""} required>
              <option value="">— vendor —</option>
              {vendors.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            <input name="cost" className="input" inputMode="decimal" placeholder="Cost" defaultValue={cost ?? ""} />
            <input name="days" className="input" inputMode="numeric" placeholder="Days" defaultValue={q?.days ?? ""} />
            <div className="px-1 text-sm text-slate-600 tabular-nums">{cost != null && acres ? money(cost / acres, true) : "—"}</div>
            <input name="quoteDate" type="date" className="input" defaultValue={dateInput(q?.quoteDate ?? (isNew ? new Date() : null))} />
            <StatusSelect value={q?.status} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isSelected" defaultChecked={q?.isSelected} /> <span className="md:hidden">Final vendor</span></label>
            <input name="comments" className="input" placeholder="Comments" defaultValue={q?.comments ?? ""} />
            <Submit className={isNew ? "btn-primary btn-sm" : "btn-secondary btn-sm"} pendingText="…">{isNew ? "Add" : "Save"}</Submit>
          </div>
        </ActionForm>
        {q && (
          <form action={deleteMappingQuote.bind(null, q.id)} className="pt-0.5">
            <Submit className="btn-danger btn-sm" pendingText="…" confirm="Delete this quote?">✕</Submit>
          </form>
        )}
      </div>
    </div>
  );
}
