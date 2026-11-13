import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { saveUser } from "../actions";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Users" subtitle="Initials appear as “DVT PM” on proposals and projects. Only admins can delete records." />
      <Card>
        <div className="hidden grid-cols-[1.4fr_0.6fr_1.6fr_0.8fr_1.2fr_0.5fr_auto] gap-2 px-1 text-[11px] font-semibold text-slate-500 md:grid">
          <span>Name</span><span>Initials</span><span>Email</span><span>Role</span><span>New password</span><span>Active</span><span />
        </div>
        <div className="space-y-2">
          {[...users, null].map((u) => (
            <ActionForm key={u?.id ?? "new"} action={saveUser.bind(null, u?.id ?? null)} resetOnSuccess={!u}>
              <div className={`grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_0.6fr_1.6fr_0.8fr_1.2fr_0.5fr_auto] md:items-center ${u && !u.active ? "opacity-60" : ""}`}>
                <input name="name" className="input" placeholder="Full name" required defaultValue={u?.name ?? ""} />
                <input name="initials" className="input" placeholder="AB" required defaultValue={u?.initials ?? ""} />
                <input name="email" type="email" className="input" placeholder="Email" required defaultValue={u?.email ?? ""} />
                <select name="role" className="input" defaultValue={u?.role ?? "USER"}><option value="USER">User</option><option value="ADMIN">Admin</option></select>
                <input name="password" type="password" className="input" placeholder={u ? "leave blank to keep" : "initial password"} autoComplete="new-password" />
                {u ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={u.active} />Active</label> : <span />}
                <Submit className={u ? "btn-secondary btn-sm" : "btn-primary btn-sm"} pendingText="…">{u ? "Save" : "Add user"}</Submit>
              </div>
            </ActionForm>
          ))}
        </div>
      </Card>
    </>
  );
}
