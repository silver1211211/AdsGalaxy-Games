import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TenantAdministratorLoginForm } from "@/components/tenant-admin/browser-login-form";
import { isValidTenantSlug } from "@/features/tenant-admin/boundary";

export default async function TenantAdministratorLogin({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  if (!isValidTenantSlug(tenantSlug)) notFound();
  const tenant = await prisma.miniApp.findUnique({ where: { slug: tenantSlug }, select: { name: true, status: true } });
  if (!tenant) notFound();
  if (tenant.status !== "ACTIVE") redirect(`/${tenantSlug}`);
  return <TenantAdministratorLoginForm tenantName={tenant.name} tenantSlug={tenantSlug} />;
}
