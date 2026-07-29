import { redirect } from "next/navigation";
import { TenantAdminShell } from "@/components/tenant-admin/admin-shell";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireTenantAdminPageIdentity } from "@/features/tenant-admin/auth";

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const auth = await requireTenantAdminPageIdentity(tenantSlug);
  const elevation = await getAdminElevation({
    userId: auth.userId,
    scopeType: "TENANT_ADMIN",
    miniAppId: auth.miniAppId,
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect(`/${tenantSlug}/administrator-verification`);
  if (elevation.mustChangePassword)
    redirect(`/${tenantSlug}/administrator-security`);
  return (
    <TenantAdminShell tenantSlug={tenantSlug} tenantName={auth.miniApp.name}>
      {children}
    </TenantAdminShell>
  );
}
