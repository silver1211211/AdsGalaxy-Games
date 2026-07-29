import Link from "next/link";
import { GeneralSettingsForm } from "@/components/tenant-admin/general-settings-form";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requireTenantAdminPage(tenantSlug);
  const links = [
    ["Security", `/${tenantSlug}/administrator-security`],
    ["Telegram Bot", `/${tenantSlug}/admin/settings/telegram-bot`],
    ["Audit Log", `/${tenantSlug}/admin/settings/audit-log`],
  ];
  return <><p className="text-xs font-black uppercase tracking-wider text-teal-600">Admin</p><h1 className="mt-1 text-3xl font-black">Settings</h1><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]"><GeneralSettingsForm tenantSlug={tenantSlug} /><aside className="grid content-start gap-3">{links.map(([label, path]) => <Link key={path} href={path} className="rounded-3xl bg-white p-5 font-black shadow-card">{label}<span className="mt-2 block text-xs text-teal-700">Open →</span></Link>)}</aside></div></>;
}
