import { BotSettingsForm } from "@/components/tenant-admin/bot-settings-form";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requireTenantAdminPage(tenantSlug);
  return <><p className="text-xs font-black uppercase tracking-wider text-teal-600">Telegram integration</p><h1 className="mt-1 text-3xl font-black">Bot configuration</h1><p className="mb-6 mt-2 text-sm text-warm-500">Connect a bot once. Its token is validated with Telegram, encrypted at rest, and never returned by the API.</p><BotSettingsForm tenantSlug={tenantSlug} /></>;
}
