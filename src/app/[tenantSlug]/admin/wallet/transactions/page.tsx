import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params,
    a = await requireTenantAdminPage(tenantSlug),
    items = await prisma.walletTransaction.findMany({
      where: { miniAppId: a.miniAppId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  return (
    <>
      <p className="text-xs font-black uppercase tracking-wider text-teal-600">
        Immutable ledger
      </p>
      <h1 className="mt-1 text-3xl font-black">Transactions</h1>
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card">
        {items.map((t) => (
          <div
            key={t.id}
            className="grid gap-1 border-b border-warm-50 px-5 py-4 sm:grid-cols-[1fr_.7fr_.5fr]"
          >
            <div>
              <p className="text-sm font-black">
                {t.type.replaceAll("_", " ")}
              </p>
              <p className="text-xs text-warm-400">
                {t.user.username ?? t.user.firstName} ·{" "}
                {t.createdAt.toLocaleString()}
              </p>
            </div>
            <p className="text-sm font-bold">{t.status}</p>
            <p
              className={`font-black ${t.amount.isNegative() ? "text-coral-600" : "text-teal-700"}`}
            >
              {t.amount.isNegative() ? "" : "+"}${t.amount.toFixed(2)}
            </p>
          </div>
        ))}
        {!items.length && (
          <p className="p-8 text-center text-sm text-warm-400">
            No transactions.
          </p>
        )}
      </div>
    </>
  );
}
