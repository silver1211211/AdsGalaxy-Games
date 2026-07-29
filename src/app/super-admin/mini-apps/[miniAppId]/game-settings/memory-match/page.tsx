import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { MemoryMatchSettingsForm } from "@/components/admin/memory-match-settings-form";
export default async function SuperAdminMemorySettings({ params }: { params: Promise<{ miniAppId: string }> }) {
  try { await requireSuperAdmin(); } catch { redirect("/games"); }
  const { miniAppId } = await params;
  const app = await prisma.miniApp.findUnique({ where: { id: miniAppId } });
  if (!app) redirect("/super-admin");
  return <main className="mx-auto min-h-dvh max-w-[980px] px-4 py-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral-500">Super Admin · {app.name}</p><h1 className="mt-1 text-3xl font-extrabold">Memory Match Settings</h1><p className="mb-7 mt-2 text-sm text-warm-600">Cross-tenant access is available only through verified Super Admin authorization.</p><MemoryMatchSettingsForm miniAppId={miniAppId} /></main>;
}
