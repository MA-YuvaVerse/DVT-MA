import { clientOptions, contactOptions, listValues, projectOptions, userOptions } from "@/lib/lookups";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { ProposalHeaderFields, VersionScopeFields } from "@/components/ProposalFields";
import { createProposal } from "../actions";

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const parent = sp.parent ? await prisma.project.findUnique({ where: { id: sp.parent } }) : null;
  const [clients, contacts, users, projects, projectType, sensorType, deliverables] = await Promise.all([
    clientOptions(), contactOptions(), userOptions(), projectOptions(), listValues("PROJECT_TYPE"), listValues("SENSOR_TYPE"), listValues("DELIVERABLE"),
  ]);
  return (
    <>
      <PageHeader title={parent ? `New add-on proposal for ${parent.number}` : "New proposal"} subtitle="The proposal number is assigned automatically when you save." back={{ href: "/proposals", label: "Proposals" }} />
      <ActionForm action={createProposal} className="space-y-4">
        <Card title="Client & location">
          <ProposalHeaderFields clients={clients} contacts={contacts} users={users} projects={projects} p={{ companyId: parent?.companyId ?? "", clientContactId: parent?.clientContactId ?? null, dvtPmId: parent?.dvtPmId ?? user.id, opportunityType: parent ? "ADD_ON" : "NEW", parentProjectId: parent?.id ?? null, city: parent?.city ?? null, state: parent?.state ?? null, latitude: parent?.latitude ?? null, longitude: parent?.longitude ?? null, folderUrl: null, comments: null }} />
          {clients.length === 0 && <p className="mt-2 text-sm text-amber-700">No clients yet — add the company first under Companies (type Client or Prospect).</p>}
        </Card>
        <Card title="Scope (version .1)">
          <VersionScopeFields lists={{ projectType, sensorType, deliverables }} />
        </Card>
        <div className="flex gap-2"><Submit>Create proposal</Submit></div>
      </ActionForm>
    </>
  );
}
