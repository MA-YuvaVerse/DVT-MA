import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Empty, LinkTabs, PageHeader } from "@/components/ui";

type SP = { q?: string; type?: string; inactive?: string };
const TYPES: Record<string, Prisma.CompanyWhereInput> = {
  client: { isClient: true }, prospect: { isProspect: true }, acq: { isAcqVendor: true }, mapping: { isMappingVendor: true },
};

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where: Prisma.CompanyWhereInput = { ...(sp.type ? TYPES[sp.type] : {}), ...(sp.inactive ? {} : { active: true }) };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { shortName: { contains: sp.q, mode: "insensitive" } }, { code: { contains: sp.q, mode: "insensitive" } }];
  const rows = await prisma.company.findMany({
    where, orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, proposals: true, projects: true, acqQuotes: true, mappingQuotes: true, sensors: true } } },
  });
  const types = (c: (typeof rows)[number]) => [c.isClient && "Client", c.isProspect && "Prospect", c.isAcqVendor && "Acq vendor", c.isMappingVendor && "Mapping vendor"].filter(Boolean).join(", ");
  return (
    <>
      <PageHeader title="Companies" subtitle={`${rows.length} shown`} actions={<Link href="/companies/new" className="btn-primary">New company</Link>} />
      <div className="mb-3">
        <LinkTabs active={sp.type ?? ""} tabs={[["", "All"], ["client", "Customers"], ["prospect", "Prospects"], ["acq", "Acquisition vendors"], ["mapping", "Mapping vendors"]].map(([k, label]) => ({ key: k, label, href: k ? `/companies?type=${k}` : "/companies" }))} />
      </div>
      <form className="card mb-3 grid gap-2 p-3 sm:grid-cols-[2fr_1fr_auto_auto]">
        <input name="q" defaultValue={sp.q} className="input" placeholder="Search name or code…" />
        <select name="type" defaultValue={sp.type ?? ""} className="input">
          <option value="">All types</option><option value="client">Clients</option><option value="prospect">Prospects</option><option value="acq">Acquisition vendors</option><option value="mapping">Mapping vendors</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="inactive" defaultChecked={!!sp.inactive} /> include inactive</label>
        <button className="btn-secondary">Apply</button>
      </form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>No companies.</Empty> : (
          <table className="table">
            <thead><tr><th>Code</th><th>Company</th><th>Short</th><th>Type</th><th>Location</th><th className="text-right">Contacts</th><th className="text-right">Proposals</th><th className="text-right">Projects</th><th className="text-right">Quotes</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td className="text-slate-500">{c.code}</td>
                  <td><Link className="link font-medium" href={`/companies/${c.id}`}>{c.name}</Link></td>
                  <td>{c.shortName}</td>
                  <td className="text-xs">{types(c)}{c.vendorType ? ` · ${c.vendorType}` : ""}</td>
                  <td className="whitespace-nowrap">{[c.city, c.state].filter(Boolean).join(", ")}</td>
                  <td className="text-right">{c._count.contacts}</td>
                  <td className="text-right">{c._count.proposals}</td>
                  <td className="text-right">{c._count.projects}</td>
                  <td className="text-right">{c._count.acqQuotes + c._count.mappingQuotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
