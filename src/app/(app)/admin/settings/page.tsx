import { getSettings } from "@/lib/settings";
import { PIPELINE_RULES } from "@/lib/constants";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { saveSettings } from "../actions";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" />
      <ActionForm action={saveSettings} className="space-y-4">
        <Card title="Pipeline">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Proposal value when it has several open versions" hint="Versions are alternatives, so they are never added together." className="sm:col-span-2 lg:col-span-3">
              <Select name="pipelineRule" options={Object.entries(PIPELINE_RULES).map(([value, label]) => ({ value, label }))} value={s.pipelineRule} />
            </Field>
            <Field label="Probability — New Request (%)"><input name="probRequest" className="input" defaultValue={s.probRequest} /></Field>
            <Field label="Probability — Qualifying (%)"><input name="probQualifying" className="input" defaultValue={s.probQualifying} /></Field>
            <Field label="Probability — Preparing Proposal (%)"><input name="probPreparing" className="input" defaultValue={s.probPreparing} /></Field>
            <Field label="Probability — Proposal Sent (%)"><input name="probOpen" className="input" defaultValue={s.probOpen} /></Field>
            <Field label="Probability — High Probability (%)"><input name="probHigh" className="input" defaultValue={s.probHigh} /></Field>
            <Field label="Proposal Sent becomes stale after (days)"><input name="staleDays" className="input" defaultValue={s.staleDays} /></Field>
            <Field label="Probability — stale Proposal Sent (%)"><input name="probOpenStale" className="input" defaultValue={s.probOpenStale} /></Field>
            <Field label="Default follow-up reminder (days)"><input name="followUpDays" className="input" defaultValue={s.followUpDays} /></Field>
          </div>
        </Card>
        <Card title="Screens">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showReportsCosting" defaultChecked={s.showReportsCosting === "true"} /> Show Reports and Costing &amp; margin screens to users
          </label>
          <p className="mt-1 text-xs text-slate-500">Off by default to keep screens simple. Turning it on brings back the Reports menu, the Costing tab and margin figures; nothing is deleted while it is off.</p>
        </Card>
        <Card title="Numbering">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Proposal number year prefix" hint="4 → 202600362, 2 → 2600362">
              <Select name="proposalYearDigits" options={[{ value: "4", label: "4 digits (YYYY#####)" }, { value: "2", label: "2 digits (YY#####)" }]} value={s.proposalYearDigits} />
            </Field>
            <Field label="Project number infix" hint="Normally 18 (fixed placeholder). Format: YYMM + 18 + ## + method, e.g. 2607 18 04 P"><input name="projectNumberInfix" className="input" defaultValue={s.projectNumberInfix} /></Field>
            <Field label="Company name"><input name="companyName" className="input" defaultValue={s.companyName} /></Field>
          </div>
        </Card>
        <Submit>Save settings</Submit>
      </ActionForm>
    </>
  );
}
