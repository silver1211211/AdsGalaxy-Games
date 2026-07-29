import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const auth = await requireTenantAdminPage(tenantSlug);
  const items = await prisma.adminAuditLog.findMany({ where: { miniAppId: auth.miniAppId }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return <><p className="text-xs font-black uppercase tracking-wider text-teal-600">Compliance trail</p><h1 className="mt-1 text-3xl font-black">Audit log</h1><div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card">{items.map((item) => <div key={item.id} className="border-b border-warm-50 px-5 py-4"><p className="text-sm font-black">{item.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-warm-400">{item.actor?.username ?? item.actor?.firstName ?? "Public applicant"} · {item.targetType} · {item.createdAt.toLocaleString()}</p></div>)}{!items.length && <p className="p-8 text-center text-sm text-warm-400">No audit records.</p>}</div></>;
}
