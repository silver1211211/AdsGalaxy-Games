import { notFound } from "next/navigation";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";

export default async function TenantUserDetail({ params }: { params: Promise<{ tenantSlug: string; userId: string }> }) {
  const { tenantSlug,userId } = await params, auth = await requireTenantAdminPage(tenantSlug);
  const membership = await prisma.miniAppMembership.findUnique({
    where: { miniAppId_userId: { miniAppId: auth.miniAppId, userId } }, include: { user: true }
  });
  if (!membership || membership.role !== "USER") notFound();
  const [wallet, points, attempts, notes] = await Promise.all([
    prisma.wallet.findUnique({ where: { miniAppId_userId: { miniAppId: auth.miniAppId, userId } } }),
    prisma.pointTransaction.findFirst({ where: { miniAppId: auth.miniAppId, userId }, orderBy: { createdAt: "desc" } }),
    prisma.taskAttempt.count({ where: { miniAppId: auth.miniAppId, userId } }),
    prisma.adminUserNote.findMany({ where: { miniAppId: auth.miniAppId, userId }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  return <><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">User details</p><h1 className="mt-1 text-3xl font-black">{membership.user.firstName} {membership.user.lastName}</h1><p className="mt-2 text-sm text-warm-500">@{membership.user.username ?? "no_username"} · Telegram {membership.user.telegramId}</p>
  <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Membership",membership.status],["Wallet",`$${Number(wallet?.availableBalance ?? 0).toFixed(2)}`],["Points",(points?.balanceAfter ?? 0).toLocaleString()],["Task attempts",attempts.toLocaleString()]].map(([l,v])=><div key={l} className="rounded-3xl bg-white p-5 shadow-card"><p className="text-xs text-warm-400">{l}</p><p className="mt-2 text-xl font-black">{v}</p></div>)}</section>
  <section className="mt-6 rounded-3xl bg-white p-5 shadow-card"><h2 className="font-black">Private Admin notes</h2>{notes.length?notes.map(note=><p key={note.id} className="mt-3 rounded-2xl bg-warm-50 p-3 text-sm">{note.body}</p>):<p className="mt-3 text-sm text-warm-400">No private notes for this user.</p>}</section></>;
}
