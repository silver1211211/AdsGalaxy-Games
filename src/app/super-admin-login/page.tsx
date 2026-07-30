import { redirect } from "next/navigation";
import { SuperAdminBrowserLoginForm } from "@/components/super-admin/browser-login-form";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminLoginPage() {
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") {
    const platformSlug = process.env.PLATFORM_MINI_APP_SLUG ?? "ads-galaxy";
    if (session.miniApp.slug !== platformSlug || session.miniApp.status !== "ACTIVE")
      return <SuperAdminBrowserLoginForm />;
    const credential = await prisma.adminCredential.findUnique({
      where: {
        userId_scopeType: {
          userId: session.userId,
          scopeType: "SUPER_ADMIN",
        },
      },
      select: { id: true },
    });
    if (!credential) return <SuperAdminBrowserLoginForm />;
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
