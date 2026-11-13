import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  if (u.role !== "ADMIN") return <div className="card p-6 text-sm">Administrators only.</div>;
  return <>{children}</>;
}
