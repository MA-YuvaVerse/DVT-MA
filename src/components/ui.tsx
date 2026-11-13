import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back.href} className="text-xs text-slate-500 hover:underline">← {back.label}</Link>}
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", bodyClass = "p-3" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "Preparing Proposal": "bg-slate-100 text-slate-700",
  Open: "bg-blue-50 text-blue-700",
  "Open/HIGH": "bg-indigo-100 text-indigo-800",
  "DVT Won": "bg-emerald-100 text-emerald-800",
  "Client Lost": "bg-amber-50 text-amber-800",
  "Client Won/DVT Lost": "bg-red-50 text-red-700",
  "On Hold": "bg-yellow-50 text-yellow-800",
  Abandoned: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-100 text-slate-500",
  Awarded: "bg-sky-50 text-sky-700",
  Acquisition: "bg-violet-50 text-violet-700",
  Production: "bg-indigo-50 text-indigo-700",
  "Ready for Invoicing": "bg-amber-50 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Requested: "bg-slate-100 text-slate-600",
  Received: "bg-blue-50 text-blue-700",
  Declined: "bg-slate-100 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export function Field({ label, children, className = "", hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function ReadOnly({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="label">{label}</div>
      <div className="min-h-[30px] rounded-md bg-slate-50 px-2 py-1.5 text-sm">{value ?? "—"}</div>
    </div>
  );
}

export function Select({ name, options, value, placeholder, required, className = "", disabled }: {
  name: string;
  options: (string | { value: string; label: string })[];
  value?: string | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const has = value == null || value === "" || opts.some((o) => o.value === value);
  return (
    <select name={name} defaultValue={value ?? ""} required={required} disabled={disabled} className={`input ${className}`}>
      <option value="">{placeholder ?? "—"}</option>
      {!has && <option value={value!}>{value} (not in list)</option>}
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Kpi({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <div className="card h-full p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-6 text-center text-sm text-slate-500">{children}</div>;
}

export function LinkTabs({ tabs, active }: { tabs: { key: string; label: ReactNode; href: string }[]; active: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          className={`-mb-px border-b-2 px-3 py-1.5 text-sm whitespace-nowrap ${
            active === t.key ? "border-brand-600 font-semibold text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
