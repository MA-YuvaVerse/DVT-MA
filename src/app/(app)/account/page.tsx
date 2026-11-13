import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/client";
import { changeOwnPassword } from "../admin/actions";
import { logout } from "../actions";

export default async function AccountPage() {
  const u = await requireUser();
  return (
    <>
      <PageHeader title="Account" subtitle={`${u.name} · ${u.email} · ${u.role === "ADMIN" ? "Administrator" : "User"}`} actions={<form action={logout}><button className="btn-secondary">Sign out</button></form>} />
      <Card title="Change password" className="max-w-md">
        <ActionForm action={changeOwnPassword} className="space-y-2" resetOnSuccess>
          <input name="current" type="password" className="input" placeholder="Current password" autoComplete="current-password" required />
          <input name="next" type="password" className="input" placeholder="New password (10+ characters)" autoComplete="new-password" required />
          <input name="confirm" type="password" className="input" placeholder="Confirm new password" autoComplete="new-password" required />
          <Submit>Change password</Submit>
        </ActionForm>
      </Card>
    </>
  );
}
