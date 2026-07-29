import { redirect } from "next/navigation";
import { ChangeAdministratorPasswordForm } from "@/components/admin/change-administrator-password-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireSuperAdminIdentity } from "@/lib/session";

export default async function SuperAdminSecurity() {
  let auth;
  try {
    auth = await requireSuperAdminIdentity();
  } catch {
    redirect(
      process.env.NODE_ENV === "development"
        ? "/dev/access?next=/super-admin-security"
        : "/",
    );
  }
  const elevation = await getAdminElevation({
    userId: auth.userId,
    scopeType: "SUPER_ADMIN",
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect("/super-admin-verification");
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">
        Platform security
      </p>
      <h1 className="mt-2 text-3xl font-black">Change Super Admin Password</h1>
      <p className="mb-6 mt-2 text-sm text-warm-600">
        Your current password is required. Prior elevated Super Admin sessions
        will be revoked.
      </p>
      <ChangeAdministratorPasswordForm
        endpoint="/api/super-admin/security/change-password"
        successPath="/super-admin-verification"
        forced={elevation.mustChangePassword}
      />
    </main>
  );
}
