import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5">
          <div className="text-lg font-semibold">DroneView Ops</div>
          <p className="text-sm text-slate-500">Proposals, vendor quotes and projects</p>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
