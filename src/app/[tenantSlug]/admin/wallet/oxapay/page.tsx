import { OxaPaySettings } from "@/components/tenant-admin/oxapay-settings";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantAdminPage(tenantSlug);
  return (
    <>
      <p className="text-xs font-black uppercase tracking-wider text-teal-600">
        Wallet
      </p>
      <h1 className="mt-1 text-3xl font-black">OxaPay withdrawals</h1>
      <p className="mb-6 mt-2 text-sm text-warm-500">
        Configure manual or automatic payout processing without exposing
        provider credentials.
      </p>
      <OxaPaySettings tenantSlug={tenantSlug} />
    </>
  );
}
