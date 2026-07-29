import Link from "next/link";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { getTenantAdminDashboard } from "@/features/tenant-admin/dashboard";
export default async function TenantWallet({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params,
    auth = await requireTenantAdminPage(tenantSlug),
    data = await getTenantAdminDashboard(auth.miniAppId),
    base = `/${tenantSlug}/admin/wallet`;
  return (
    <>
      <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">
        Financial operations
      </p>
      <h1 className="mt-1 text-3xl font-black">Wallet</h1>
      <p className="mt-2 text-sm text-warm-500">
        User liabilities, pending rewards, withdrawal holds, and immutable
        transaction history.
      </p>
      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Available liability", data.wallet.available],
          ["Pending rewards", data.wallet.pending],
          ["Withdrawal holds", data.wallet.held],
        ].map(([l, v]) => (
          <div key={l} className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs text-warm-400">{l}</p>
            <p className="mt-2 text-2xl font-black">${Number(v).toFixed(2)}</p>
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Withdrawals", "/withdrawals"],
          ["Transactions", "/transactions"],
          ["Wallet settings", "/settings"],
          ["OxaPay withdrawals", "/oxapay"],
        ].map(([l, p]) => (
          <Link
            key={p}
            href={`${base}${p}`}
            className="rounded-3xl bg-white p-5 font-black shadow-card"
          >
            {l}
            <span className="mt-2 block text-xs font-bold text-teal-700">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
