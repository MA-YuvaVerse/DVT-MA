import { clientOptions, contactOptions, listValues, projectOptions, userOptions } from "@/lib/lookups";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { ProjectDetailFields } from "../ProjectDetailFields";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  const [clients, contacts, users, projects, projectType, sensorType, deliverables, pid] = await Promise.all([
    clientOptions(), contactOptions(), userOptions(), projectOptions(), listValues("PROJECT_TYPE"), listValues("SENSOR_TYPE"), listValues("DELIVERABLE"), listValues("PID_TARGETS"),
  ]);
  return (
    <>
      <PageHeader title="New project" subtitle="Normally projects are created by awarding a proposal version. Use this only for work without a proposal." back={{ href: "/projects", label: "Projects" }} />
      <ActionForm action={createProject} className="space-y-4">
        <Card title="Numbering">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Project number" hint="Leave blank to auto-generate"><input name="number" className="input" placeholder="auto" /></Field>
            <Field label="Add-on to (parent project)"><Select name="parentProjectId" options={projects} placeholder="— none —" /></Field>
            <Field label="Award date"><input type="date" name="awardDate" className="input" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          </div>
        </Card>
        <Card title="Project">
          <ProjectDetailFields clients={clients} contacts={contacts} users={users} lists={{ projectType, sensorType, deliverables, pid }} />
        </Card>
        <Submit>Create project</Submit>
      </ActionForm>
    </>
  );
}
