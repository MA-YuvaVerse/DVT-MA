import { listValues } from "@/lib/lookups";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { CompanyFields } from "../CompanyFields";
import { createCompany } from "../actions";

export default async function NewCompanyPage() {
  const vendorTypes = await listValues("VENDOR_TYPE");
  return (
    <>
      <PageHeader title="New company" subtitle="Clients, prospects and vendors all live here — one record per organisation." back={{ href: "/companies", label: "Companies" }} />
      <ActionForm action={createCompany} className="space-y-3">
        <Card><CompanyFields vendorTypes={vendorTypes} /></Card>
        <Submit>Create company</Submit>
      </ActionForm>
    </>
  );
}
