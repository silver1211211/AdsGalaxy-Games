import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Building2, CircleDollarSign, UserCog, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/features/super-admin/auth";

export default async function SuperAdminOverview() {
  await requireSuperAdminPage();
  const now = new Date(), today = new Date(now); today.setHours(0,0,0,0);
  const week = new Date(today); week.setDate(week.getDate() - 6);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const [
    totalTenants, activeTenants, totalUsers, usersToday, usersWeek,
    activeToday, admins, pendingWithdrawals, walletLiability, holdLiability,
    completedWithdrawals, suspendedTenants, maintenanceTenants, tenantsToday,
    tenantsMonth, memberships, bannedUsers, tenantBans, missingBots,
    missingAds, missingOxaPay, recentActivity, topTenants,
  ] = await Promise.all([
    prisma.miniApp.count(), prisma.miniApp.count({where:{status:"ACTIVE"}}),
    prisma.user.count(), prisma.user.count({where:{createdAt:{gte:today}}}),
    prisma.user.count({where:{createdAt:{gte:week}}}),
    prisma.user.count({where:{memberships:{some:{lastActiveAt:{gte:today}}}}}),
    prisma.miniAppMembership.count({where:{role:"ADMIN"}}),
    prisma.withdrawal.count({where:{status:{in:["PENDING","UNDER_REVIEW","APPROVED","PROCESSING"]}}}),
    prisma.wallet.aggregate({_sum:{availableBalance:true}}),
    prisma.wallet.aggregate({_sum:{withdrawalHoldBalance:true}}),
    prisma.withdrawal.count({where:{status:"COMPLETED"}}),
    prisma.miniApp.count({where:{status:"PAUSED"}}),
    prisma.tenantAdminSettings.count({where:{maintenanceMode:true}}),
    prisma.miniApp.count({where:{createdAt:{gte:today}}}),
    prisma.miniApp.count({where:{createdAt:{gte:month}}}),
    prisma.miniAppMembership.count(),
    prisma.user.count({where:{status:"BANNED"}}),
    prisma.miniAppMembership.count({where:{status:"SUSPENDED"}}),
    prisma.miniApp.count({where:{botConfiguration:null}}),
    prisma.miniApp.count({where:{adConfiguration:{is:{miniAppPublicId:null}}}}).catch(()=>0),
    prisma.miniApp.count({where:{oxaPayCredential:null}}),
    prisma.adminAuditLog.findMany({include:{actor:true,miniApp:true},orderBy:{createdAt:"desc"},take:8}),
    prisma.miniApp.findMany({include:{_count:{select:{memberships:true}},memberships:{where:{role:"ADMIN",status:"ACTIVE"},include:{user:true},take:1}},orderBy:{createdAt:"desc"},take:8}),
  ]);
  const alerts = missingBots + missingAds + missingOxaPay + suspendedTenants;
  const metrics = [
    ["Total tenants",totalTenants,Building2],["Active tenants",activeTenants,Building2],
    ["Unique users",totalUsers,Users],["Joined today",usersToday,Users],
    ["Active today",activeToday,Users],["Tenant admins",admins,UserCog],
    ["Pending withdrawals",pendingWithdrawals,CircleDollarSign],["Platform alerts",alerts,AlertTriangle],
  ] as const;
  return <div className="grid gap-7">
    <PageHeading title="Global Overview" subtitle="Live platform health, growth, tenant activity, and read-only financial exposure."/>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{metrics.map(([label,value,Icon])=><article className="sa-card min-w-0 p-4" key={label}><Icon size={17} className="text-teal-600"/><p className="mt-4 text-2xl font-black">{value}</p><p className="sa-muted mt-1 text-[11px] font-bold">{label}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-3">
      <Summary title="Tenant health" items={[["Suspended",suspendedTenants],["Maintenance",maintenanceTenants],["Created today",tenantsToday],["Created this month",tenantsMonth],["Missing bot",missingBots]]}/>
      <Summary title="Global users" items={[["Unique users",totalUsers],["Memberships",memberships],["Joined 7 days",usersWeek],["Globally banned",bannedUsers],["Tenant bans",tenantBans]]}/>
      <Summary title="Financial exposure" items={[["Available liability",`$${Number(walletLiability._sum.availableBalance??0).toFixed(2)}`],["Withdrawal holds",`$${Number(holdLiability._sum.withdrawalHoldBalance??0).toFixed(2)}`],["Pending withdrawals",pendingWithdrawals],["Completed withdrawals",completedWithdrawals],["OxaPay not connected",missingOxaPay]]}/>
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
      <div className="sa-card overflow-hidden"><div className="flex items-center justify-between p-5"><div><h2 className="font-black">Top tenants</h2><p className="sa-muted text-xs">Current membership footprint</p></div><Link href="/super-admin/tenants" className="text-xs font-black text-teal-600">View all</Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="sa-muted bg-[var(--sa-surface-2)]"><tr><th className="p-3">Tenant</th><th>Users</th><th>Administrator</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>{topTenants.map(t=><tr key={t.id} className="border-t border-[var(--sa-border)]"><td className="p-3"><strong>{t.name}</strong><span className="sa-muted block">{t.slug}</span></td><td>{t._count.memberships}</td><td>{t.memberships[0]?.user.username??t.memberships[0]?.user.firstName??"Unassigned"}</td><td>{t.status}</td><td>{t.createdAt.toLocaleDateString()}</td><td><Link href={`/super-admin/tenants/${t.id}`} aria-label={`View ${t.name}`}><ArrowUpRight size={16}/></Link></td></tr>)}</tbody></table></div>
      </div>
      <div className="sa-card p-5"><h2 className="font-black">Recent global activity</h2><div className="mt-4 grid gap-4">{recentActivity.map(a=><article key={a.id}><p className="text-xs font-black">{a.action.replaceAll("_"," ")}</p><p className="sa-muted mt-1 text-[10px]">{a.actor.username??a.actor.firstName} · {a.miniApp?.name??a.targetType} · {a.createdAt.toLocaleString()}</p></article>)}{!recentActivity.length&&<p className="sa-muted text-xs">No global activity yet.</p>}</div></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-3"><Quick href="/super-admin/tenants?create=1" label="Add Tenant"/><Quick href="/super-admin/administrators?create=1" label="Assign Administrator"/><Quick href="/super-admin/users" label="Search Users"/></section>
  </div>;
}

function PageHeading({title,subtitle}:{title:string;subtitle:string}){return <header><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Super Admin</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="sa-muted mt-2 max-w-3xl text-sm">{subtitle}</p></header>}
function Summary({title,items}:{title:string;items:(readonly [string,string|number])[]}){return <article className="sa-card p-5"><h2 className="font-black">{title}</h2><dl className="mt-4 grid grid-cols-2 gap-3">{items.map(([l,v])=><div key={l} className="rounded-xl bg-[var(--sa-surface-2)] p-3"><dt className="sa-muted text-[10px] font-bold">{l}</dt><dd className="mt-1 font-black">{v}</dd></div>)}</dl></article>}
function Quick({href,label}:{href:string;label:string}){return <Link href={href} className="sa-card flex min-h-20 items-center justify-between p-5 font-black">{label}<ArrowUpRight size={17}/></Link>}
