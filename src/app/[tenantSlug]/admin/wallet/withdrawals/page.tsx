import { WithdrawalActions } from "@/components/tenant-admin/withdrawal-actions";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const auth = await requireTenantAdminPage(tenantSlug);
  const items = await prisma.withdrawal.findMany({
    where: { miniAppId: auth.miniAppId },
    include: { user: true, payoutMethod: true, oxaPayAttempt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <p className="text-xs font-black uppercase tracking-wider text-teal-600">
        Wallet queue
      </p>
      <h1 className="mt-1 text-3xl font-black">Withdrawals</h1>
      <p className="mt-2 text-sm text-warm-500">
        Manual review and tenant-scoped provider history. Destinations remain
        masked.
      </p>
      <div className="mt-6 grid gap-3">
        {items.map((withdrawal) => (
          <article
            key={withdrawal.id}
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="font-black">
                ${withdrawal.amount.toFixed(2)} ·{" "}
                {withdrawal.payoutCurrency ?? withdrawal.payoutMethod.name}{" "}
                {withdrawal.payoutNetwork
                  ? `· ${withdrawal.payoutNetwork}`
                  : ""}
              </h2>
              <span className="text-xs font-bold">
                {withdrawal.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-xs text-warm-500">
              {withdrawal.user.username ?? withdrawal.user.firstName} ·{" "}
              {withdrawal.destinationMasked} ·{" "}
              {withdrawal.createdAt.toLocaleString()}
            </p>
            <dl className="mt-3 grid gap-2 rounded-xl bg-warm-50 p-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-warm-400">Mode</dt>
                <dd className="font-black">
                  {withdrawal.processingMode.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-warm-400">Provider status</dt>
                <dd className="font-black">
                  {withdrawal.providerStatus.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-warm-400">Track ID</dt>
                <dd className="break-all font-black">
                  {withdrawal.oxaPayAttempt?.trackId ?? "—"}
                </dd>
              </div>
            </dl>
            <WithdrawalActions
              tenantSlug={tenantSlug}
              withdrawalId={withdrawal.id}
              status={withdrawal.status}
              automatic={withdrawal.processingMode === "OXAPAY_AUTOMATIC"}
            />
          </article>
        ))}
        {!items.length && (
          <p className="rounded-3xl bg-white p-6 text-sm text-warm-400 shadow-card">
            No withdrawal requests.
          </p>
        )}
      </div>
    </>
  );
}
