import Link from "next/link";
import { prisma } from "@/lib/db";
import { LISTS, type ListKey } from "@/lib/constants";
import { Card, LinkTabs, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { addListItem, updateListItem } from "../actions";

export default async function ListsPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const sp = await searchParams;
  const list = (sp.list && sp.list in LISTS ? sp.list : "PROJECT_TYPE") as ListKey;
  const items = await prisma.listItem.findMany({ where: { list }, orderBy: [{ sortOrder: "asc" }, { value: "asc" }] });
  return (
    <>
      <PageHeader title="Dropdown lists" subtitle="Edit the values users pick from. Deactivate rather than rename values that are already used." />
      <LinkTabs active={list} tabs={Object.entries(LISTS).map(([k, label]) => ({ key: k, label, href: `/admin/lists?list=${k}` }))} />
      <Card className="mt-3" title={LISTS[list]}>
        <ActionForm action={addListItem.bind(null, list)} className="mb-3 flex gap-2" resetOnSuccess>
          <input name="value" className="input max-w-sm" placeholder={`New ${LISTS[list]} value`} required />
          <Submit>Add</Submit>
        </ActionForm>
        <div className="space-y-1.5">
          {items.map((i) => (
            <ActionForm key={i.id} action={updateListItem.bind(null, i.id)}>
              <div className={`grid grid-cols-[1fr_80px_auto_auto] items-center gap-2 sm:max-w-xl ${i.active ? "" : "opacity-50"}`}>
                <input name="value" className="input" defaultValue={i.value} required />
                <input name="sortOrder" className="input" inputMode="numeric" defaultValue={i.sortOrder} title="Sort order" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={i.active} />Active</label>
                <Submit className="btn-secondary btn-sm" pendingText="…">Save</Submit>
              </div>
            </ActionForm>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Vendor sensors are managed on each vendor’s <Link className="link" href="/companies?type=acq">company page</Link>.</p>
      </Card>
    </>
  );
}
