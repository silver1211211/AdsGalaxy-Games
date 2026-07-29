import { redirect } from "next/navigation";
import { AdministratorPasswordForm } from "@/components/admin/administrator-password-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireSuperAdminPageIdentity } from "@/lib/page-auth";

export default async function SuperAdminVerification() {
  const auth = await requireSuperAdminPageIdentity();
  const elevation = await getAdminElevation({
    userId: auth.userId,
    scopeType: "SUPER_ADMIN",
    allowPasswordChange: true,
  });
  if (elevation.ok)
    redirect(
      elevation.mustChangePassword ? "/super-admin-security" : "/super-admin",
    );
  return (
    <AdministratorPasswordForm
      endpoint="/api/super-admin/security/verify"
      nextPath="/super-admin"
      title="Super Admin Verification"
    />
  );
}
