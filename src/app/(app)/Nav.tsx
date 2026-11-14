"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  { href: "/", label: "Dashboard" },
  { href: "/proposals", label: "Proposals" },
  { href: "/projects", label: "Projects" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  { href: "/reports", label: "Reports" },
];
const ADMIN = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/lists", label: "Dropdown lists" },
  { href: "/admin/settings", label: "Settings" },
];

export function Nav({ isAdmin, showReports }: { isAdmin: boolean; showReports: boolean }) {
  const path = usePathname();
  const item = (l: { href: string; label: string }) => {
    const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
    return (
      <Link key={l.href} href={l.href} className={`block rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${active ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-700 hover:bg-slate-50"}`}>
        {l.label}
      </Link>
    );
  };
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-0.5 md:pb-0">
      {MAIN.filter((l) => showReports || l.href !== "/reports").map(item)}
      {isAdmin && (
        <>
          <div className="hidden px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase md:block">Admin</div>
          {ADMIN.map(item)}
        </>
      )}
      <Link href="/account" className="block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-slate-700 hover:bg-slate-50 md:hidden">Account</Link>
    </nav>
  );
}
