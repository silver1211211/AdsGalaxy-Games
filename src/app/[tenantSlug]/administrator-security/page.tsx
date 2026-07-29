import { redirect } from "next/navigation";
import { ChangeAdministratorPasswordForm } from "@/components/admin/change-administrator-password-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireTenantAdminIdentity } from "@/features/tenant-admin/auth";

export default async function TenantAdministratorSecurity({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTenantAdminIdentity(tenantSlug);
  } catch {
    redirect(
      process.env.NODE_ENV === "development"
        ? `/dev/access?next=/${tenantSlug}/administrator-security`
        : "/",
    );
  }
  const elevation = await getAdminElevation({
    userId: auth.userId,
    scopeType: "TENANT_ADMIN",
    miniAppId: auth.miniAppId,
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect(`/${tenantSlug}/administrator-verification`);
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">
        Administrator security
      </p>
      <h1 className="mt-2 text-3xl font-black">Change Password</h1>
      <p className="mb-6 mt-2 text-sm text-warm-600">
        Change only your own Administrator password. Prior elevated sessions
        will be revoked.
      </p>
      <ChangeAdministratorPasswordForm
        endpoint={`/api/${tenantSlug}/admin/security/change-password`}
        successPath={`/${tenantSlug}/administrator-verification`}
        forced={elevation.mustChangePassword}
      />
    </main>
  );
}
