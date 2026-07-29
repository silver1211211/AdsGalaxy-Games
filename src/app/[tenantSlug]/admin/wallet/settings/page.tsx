import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { WalletSettingsForm } from "@/components/admin/wallet-settings-form";
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
      <h1 className="mt-1 text-3xl font-black">Wallet settings</h1>
      <p className="mb-6 mt-2 text-sm text-warm-500">
        Conversion and per-user withdrawal settings. Platform safety controls
        remain enforced.
      </p>
      <WalletSettingsForm tenantSlug={tenantSlug} />
    </>
  );
}
