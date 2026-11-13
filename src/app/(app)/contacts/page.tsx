import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; inactive?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.ContactWhereInput = sp.inactive ? {} : { active: true };
  if (sp.q) {
    where.OR = [
      { firstName: { contains: sp.q, mode: "insensitive" } }, { lastName: { contains: sp.q, mode: "insensitive" } },
      { email: { contains: sp.q, mode: "insensitive" } }, { company: { name: { contains: sp.q, mode: "insensitive" } } },
    ];
  }
  const rows = await prisma.contact.findMany({ where, include: { company: true, _count: { select: { proposals: true } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], take: 500 });
  return (
    <>
      <PageHeader title="Contacts" subtitle={`${rows.length} shown · add or edit contacts from their company page`} />
      <form className="card mb-3 grid gap-2 p-3 sm:grid-cols-[2fr_auto_auto]">
        <input name="q" defaultValue={sp.q} className="input" placeholder="Search name, email or company…" />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="inactive" defaultChecked={!!sp.inactive} /> include inactive</label>
        <button className="btn-secondary">Apply</button>
      </form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>No contacts.</Empty> : (
          <table className="table">
            <thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Email</th><th>Phone</th><th className="text-right">Proposals</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                <td className="whitespace-nowrap">{c.firstName} {c.lastName}{!c.active && " (inactive)"}</td>
                <td><Link className="link" href={`/companies/${c.companyId}`}>{c.company.shortName ?? c.company.name}</Link></td>
                <td>{c.title}</td>
                <td>{c.email ? <a className="link" href={`mailto:${c.email}`}>{c.email}</a> : "—"}</td>
                <td className="whitespace-nowrap">{c.phone}</td>
                <td className="text-right">{c._count.proposals}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
