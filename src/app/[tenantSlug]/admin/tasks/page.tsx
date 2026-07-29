import { TasksManager } from "@/components/tenant-admin/tasks-manager";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";

export default async function TenantTasks({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requireTenantAdminPage(tenantSlug);
  return <TasksManager tenantSlug={tenantSlug} />;
}
