import { redirect } from "next/navigation";
import { AdministratorPasswordForm } from "@/components/admin/administrator-password-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireSuperAdminIdentity } from "@/lib/session";

export default async function SuperAdminVerification() {
  let auth;
  try {
    auth = await requireSuperAdminIdentity();
  } catch {
    redirect(
      process.env.NODE_ENV === "development"
        ? "/dev/access?next=/super-admin-verification"
        : "/",
    );
  }
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
