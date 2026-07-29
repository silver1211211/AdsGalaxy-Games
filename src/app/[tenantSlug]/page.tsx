import { redirect } from "next/navigation";
export default async function TenantMiniApp({ params }: { params: Promise<{ tenantSlug: string }> }) {
  await params;
  redirect("/games");
}
