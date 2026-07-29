import { notFound } from "next/navigation";
import { AdministratorActions, AdministratorPasswordReset } from "@/components/super-admin/administrator-controls";
import { requireSuperAdminPage } from "@/features/super-admin/auth";
import { prisma } from "@/lib/prisma";

export default async function AdministratorDetail({ params }: { params: Promise<{ adminId: string }> }) {
  await requireSuperAdminPage();
  const { adminId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    include: {
      memberships: { where: { role: "ADMIN" }, include: { miniApp: true } },
      appSessions: { orderBy: { createdAt: "desc" }, take: 20 },
      adminCredentials: {
        where: { scopeType: "TENANT_ADMIN" },
        select: {
          temporaryPassword: true, mustChangePassword: true, passwordChangedAt: true,
          lastVerifiedAt: true, lockedUntil: true, resetAt: true,
          resetBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!user || !user.memberships.length) notFound();
  const credential = user.adminCredentials[0];
  const locked = Boolean(credential?.lockedUntil && credential.lockedUntil > new Date());
  return <div className="grid gap-6">
    <header><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Administrator</p><h1 className="mt-1 text-3xl font-black">{user.firstName} {user.lastName}</h1><p className="sa-muted mt-2 text-sm">@{user.username ?? "no_username"} · Global status {user.status}</p></header>
    <section className="grid gap-3 md:grid-cols-3">
      <article className="sa-card p-5"><p className="sa-muted text-xs">Assigned tenants</p><p className="mt-2 text-2xl font-black">{user.memberships.length}</p></article>
      <article className="sa-card p-5"><p className="sa-muted text-xs">Credential status</p><p className="mt-2 font-black">{!credential ? "Not configured" : locked ? "Temporarily locked" : credential.mustChangePassword ? "Forced change pending" : "Active"}</p></article>
      <article className="sa-card p-5"><p className="sa-muted text-xs">Last password change</p><p className="mt-2 font-black">{credential?.passwordChangedAt?.toLocaleString() ?? "Never"}</p></article>
    </section>
    <section className="sa-card p-5"><AdministratorActions adminId={adminId} suspended={user.memberships.every((membership) => membership.status === "SUSPENDED")} /></section>
    <section className="sa-card p-5"><AdministratorPasswordReset adminId={adminId} membershipId={user.memberships[0].id} locked={locked} /></section>
    <section className="sa-card p-5"><h2 className="font-black">Credential metadata</h2><div className="mt-3 grid gap-2 text-xs"><p>Temporary password: <b>{credential?.temporaryPassword ? "Active" : "No"}</b></p><p>Last verification: <b>{credential?.lastVerifiedAt?.toLocaleString() ?? "Never"}</b></p><p>Last reset: <b>{credential?.resetAt?.toLocaleString() ?? "Never"}</b></p><p>Reset by: <b>{credential?.resetBy ? `${credential.resetBy.firstName} ${credential.resetBy.lastName ?? ""}`.trim() : "—"}</b></p></div></section>
    <section className="sa-card p-5"><h2 className="font-black">Tenant assignments</h2>{user.memberships.map((membership) => <p className="mt-3 rounded-xl bg-[var(--sa-surface-2)] p-3 text-xs font-bold" key={membership.id}>{membership.miniApp.name} · {membership.status} · Last active {membership.lastActiveAt.toLocaleString()}</p>)}</section>
    <section className="sa-card p-5"><h2 className="font-black">Safe session metadata</h2>{user.appSessions.map((session) => <p className="mt-3 text-xs" key={session.id}>{session.deviceLabel ?? session.source} · {session.createdAt.toLocaleString()} · {session.revokedAt ? "Revoked" : "Active"}</p>)}</section>
  </div>;
}
