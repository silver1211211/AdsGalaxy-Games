import { redirect } from "next/navigation";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireSuperAdminIdentity } from "@/lib/session";
import { isSuperAdminTheme } from "@/features/super-admin/policy";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireSuperAdminIdentity();
  } catch {
    redirect(
      process.env.NODE_ENV === "development"
        ? "/dev/access?next=/super-admin"
        : "/",
    );
  }
  const elevation = await getAdminElevation({
    userId: session.userId,
    scopeType: "SUPER_ADMIN",
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect("/super-admin-verification");
  if (elevation.mustChangePassword) redirect("/super-admin-security");
  const theme = isSuperAdminTheme(session.user.superAdminTheme)
    ? session.user.superAdminTheme
    : "LIGHT";
  return (
    <SuperAdminShell
      initialTheme={theme}
      accountName={`${session.user.firstName}${session.user.lastName ? ` ${session.user.lastName}` : ""}`}
    >
      {children}
    </SuperAdminShell>
  );
}
