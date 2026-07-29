import { redirect } from "next/navigation";
import { AdministratorPasswordForm } from "@/components/admin/administrator-password-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireTenantAdminIdentity } from "@/features/tenant-admin/auth";

export default async function TenantAdministratorVerification({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  let auth;
  try { auth = await requireTenantAdminIdentity(tenantSlug); }
  catch { redirect(`/dev/access?next=/${tenantSlug}/administrator-verification`); }
  const elevation = await getAdminElevation({
    userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId, allowPasswordChange: true,
  });
  if (elevation.ok) redirect(elevation.mustChangePassword ? `/${tenantSlug}/administrator-security` : `/${tenantSlug}/admin`);
  return <AdministratorPasswordForm endpoint={`/api/${tenantSlug}/admin/security/verify`} nextPath={`/${tenantSlug}/admin`} />;
}
