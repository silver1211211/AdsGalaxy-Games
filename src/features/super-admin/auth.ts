import { redirect } from "next/navigation";
import { getAdminElevation } from "@/features/admin-security/elevation";
import { requireSuperAdminPageIdentity } from "@/lib/page-auth";

export async function requireSuperAdminPage() {
  const session = await requireSuperAdminPageIdentity();
  const elevation = await getAdminElevation({
    userId: session.userId,
    scopeType: "SUPER_ADMIN",
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect("/super-admin-verification");
  if (elevation.mustChangePassword) redirect("/super-admin-security");
  return { ...session, adminElevation: elevation };
}
