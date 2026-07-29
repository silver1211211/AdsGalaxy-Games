import { redirect } from "next/navigation";
import { SuperAdminBrowserLoginForm } from "@/components/super-admin/browser-login-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { getSession } from "@/lib/session";

export default async function SuperAdminLoginPage() {
  const session = await getSession();
  if (session && session.role !== "SUPER_ADMIN") redirect("/");
  if (session?.role === "SUPER_ADMIN") {
    const elevation = await getAdminElevation({
      userId: session.userId,
      scopeType: "SUPER_ADMIN",
      allowPasswordChange: true,
    });
    if (elevation.ok)
      redirect(elevation.mustChangePassword ? "/super-admin-security" : "/super-admin");
    redirect("/super-admin-verification");
  }
  return <SuperAdminBrowserLoginForm />;
}
