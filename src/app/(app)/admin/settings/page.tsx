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
            <Field label="Probability — Preparing Proposal (%)"><input name="probPreparing" className="input" defaultValue={s.probPreparing} /></Field>
            <Field label="Probability — Open (%)"><input name="probOpen" className="input" defaultValue={s.probOpen} /></Field>
            <Field label="Probability — Open/HIGH (%)"><input name="probHigh" className="input" defaultValue={s.probHigh} /></Field>
            <Field label="Open becomes stale after (days)"><input name="staleDays" className="input" defaultValue={s.staleDays} /></Field>
            <Field label="Probability — stale Open (%)"><input name="probOpenStale" className="input" defaultValue={s.probOpenStale} /></Field>
            <Field label="Default follow-up reminder (days)"><input name="followUpDays" className="input" defaultValue={s.followUpDays} /></Field>
          </div>
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
