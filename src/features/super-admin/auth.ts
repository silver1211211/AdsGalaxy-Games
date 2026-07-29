import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/session";

export async function requireSuperAdminPage() {
  try {
    return await requireSuperAdmin();
  } catch {
    redirect("/super-admin-verification");
  }
}
