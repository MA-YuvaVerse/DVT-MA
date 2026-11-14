import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Nav } from "./Nav";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-52 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <Link href="/" className="block">
            <div className="text-base font-semibold text-brand-700">DroneView Ops</div>
            <div className="hidden text-xs text-slate-500 md:block">Proposals → Projects</div>
          </Link>
        </div>
        <Nav isAdmin={user.role === "ADMIN"} showReports={settings.showReportsCosting === "true"} />
        <div className="hidden border-t border-slate-100 px-4 py-3 text-xs text-slate-500 md:absolute md:bottom-0 md:block md:w-52">
          <div className="truncate font-medium text-slate-700">{user.name}</div>
          <div className="flex gap-3">
            <Link className="link" href="/account">Account</Link>
            <form action={logout}><button className="link">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-4 md:px-6">{children}</main>
    </div>
  );
}
