import { Prisma } from "@prisma/client";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
import { UserBanButton } from "@/components/tenant-admin/user-ban-button";

export default async function TenantUsersPage({ params, searchParams }: {
  params: Promise<{ tenantSlug: string }>; searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { tenantSlug } = await params, query = await searchParams, auth = await requireTenantAdminPage(tenantSlug);
  const q = query.q?.trim().slice(0, 80), status = ["ACTIVE","SUSPENDED"].includes(query.status ?? "") ? query.status as "ACTIVE"|"SUSPENDED" : undefined;
  const userFilter: Prisma.UserWhereInput | undefined = q ? { OR: [
      { username: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      ...( /^\d+$/.test(q) ? [{ telegramId: BigInt(q) }] : [] )
    ] } : undefined;
  const members = await prisma.miniAppMembership.findMany({
    where: { miniAppId: auth.miniAppId, role: "USER", status, user: userFilter },
    include: { user: { include: { wallets: { where: { miniAppId: auth.miniAppId }, take: 1 }, pointTransactions: { where: { miniAppId: auth.miniAppId }, orderBy: { createdAt: "desc" }, take: 1 } } } }, orderBy: { lastActiveAt: "desc" }, take: 100
  });
  return <>
    <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Audience</p><h1 className="mt-1 text-3xl font-black">Users</h1>
    <form className="mt-6 flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Search name, username or Telegram ID" className="min-h-11 flex-1 rounded-2xl border border-warm-100 bg-white px-4 text-sm"/><select name="status" defaultValue={status} className="min-h-11 rounded-2xl border border-warm-100 bg-white px-3 text-sm"><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option></select><button className="game-primary">Search</button></form>
    <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card"><div className="hidden grid-cols-[1.5fr_.65fr_.65fr_.65fr_.7fr_.5fr] gap-3 border-b px-5 py-3 text-xs font-bold text-warm-400 md:grid"><span>User</span><span>Status</span><span>Joined</span><span>Last active</span><span>Wallet / Points</span><span>Action</span></div>{members.map(member=>{const name=`${member.user.firstName} ${member.user.lastName??""}`.trim(),wallet=member.user.wallets[0],points=member.user.pointTransactions[0];return <article key={member.id} className="grid gap-3 border-b border-warm-50 px-5 py-4 last:border-0 md:grid-cols-[1.5fr_.65fr_.65fr_.65fr_.7fr_.5fr] md:items-center"><div className="flex min-w-0 items-center gap-3">{member.user.avatar?<img src={member.user.avatar} alt="" className="h-10 w-10 rounded-full object-cover"/>:<div className="grid h-10 w-10 rounded-full bg-teal-50 text-xs font-black text-teal-700 place-items-center">{name.slice(0,2).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate font-black">{name}</p><p className="truncate text-xs text-warm-400">@{member.user.username??"no_username"}</p></div></div><p className="text-xs font-bold">{member.status==="SUSPENDED"?"Banned":"Active"}</p><p className="text-xs text-warm-500">{member.createdAt.toLocaleDateString()}</p><p className="text-xs text-warm-500">{member.lastActiveAt.toLocaleDateString()}</p><p className="text-xs font-bold">${wallet?.availableBalance.toFixed(2)??"0.00"} · {points?.balanceAfter??0} pts</p><UserBanButton tenantSlug={tenantSlug} userId={member.userId} name={name} banned={member.status==="SUSPENDED"}/></article>})}{!members.length&&<p className="p-8 text-center text-sm text-warm-400">No matching users.</p>}</div>
  </>;
}
