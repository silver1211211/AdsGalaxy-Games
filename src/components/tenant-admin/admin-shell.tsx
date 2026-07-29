import Link from "next/link";
import { Settings, ExternalLink, ShieldCheck } from "lucide-react";
import { AdminNavigation } from "./admin-navigation";

export function TenantAdminShell({
  tenantSlug,
  tenantName,
  children,
}: {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}) {
  const base = `/${tenantSlug}/admin`;
  return (
    <div className="min-h-dvh bg-[#f7f6f2] text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-warm-100 bg-white px-4 py-6 lg:block">
        <div className="px-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <p className="mt-4 truncate text-lg font-black">{tenantName}</p>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-600">
            Admin
          </p>
        </div>
        <AdminNavigation tenantSlug={tenantSlug} />
        <Link
          href={`/${tenantSlug}`}
          className="absolute bottom-6 left-7 flex items-center gap-2 text-xs font-extrabold text-teal-700"
        >
          View Mini App <ExternalLink size={14} />
        </Link>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-warm-100 bg-white/90 px-4 backdrop-blur sm:px-7">
          <div>
            <p className="font-black">{tenantName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-400">
              Admin dashboard
            </p>
          </div>
          <Link
            href={`${base}/settings`}
            className="game-icon-button"
            aria-label="Admin settings"
          >
            <Settings size={17} />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-7 sm:px-7 lg:pb-12">
          {children}
        </main>
      </div>
      <AdminNavigation tenantSlug={tenantSlug} mobile />
    </div>
  );
}
