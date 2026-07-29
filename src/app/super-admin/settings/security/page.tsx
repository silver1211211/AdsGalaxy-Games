import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/features/super-admin/auth";

export default async function Security() {
  const auth = await requireSuperAdminPage();
  const [supers, sessions, credential] = await Promise.all([
    prisma.miniAppMembership.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } }),
    prisma.adminElevationSession.count({ where: { scopeType: "SUPER_ADMIN", revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.adminCredential.findUnique({ where: { userId_scopeType: { userId: auth.userId, scopeType: "SUPER_ADMIN" } } }),
  ]);
  return <div className="grid gap-5"><h1 className="text-3xl font-black">Security</h1><section className="grid gap-3 sm:grid-cols-3">{[["Super Admin accounts",supers],["Elevated sessions",sessions],["Password status",credential?.mustChangePassword?"Change required":"Configured"],["Last verified",credential?.lastVerifiedAt?.toLocaleString()??"Never"]].map(([label,value])=><article className="sa-card p-5" key={label}><p className="text-xl font-black">{value}</p><p className="sa-muted text-xs">{label}</p></article>)}</section><Link href="/super-admin-security" className="game-primary w-fit">Change My Super Admin Password</Link></div>;
}
