import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TenantActions } from "@/components/super-admin/tenant-actions";
import { TenantEditForm } from "@/components/super-admin/tenant-edit-form";
import { requireSuperAdminPage } from "@/features/super-admin/auth";

export default async function TenantDetail({params}:{params:Promise<{tenantId:string}>}){
  await requireSuperAdminPage();
  const {tenantId}=await params,t=await prisma.miniApp.findUnique({where:{id:tenantId},include:{adminSettings:true,botConfiguration:true,adConfiguration:true,oxaPayCredential:true,memberships:{include:{user:true}},wallets:true,withdrawals:true,auditLogs:{include:{actor:true},orderBy:{createdAt:"desc"},take:12},inactivityEvaluations:{orderBy:{evaluatedAt:"desc"},take:10}}});
  if(!t)notFound();const users=t.memberships.filter(m=>m.role==="USER"),admins=t.memberships.filter(m=>m.role==="ADMIN"),today=new Date();today.setHours(0,0,0,0);
  const liability=t.wallets.reduce((sum,w)=>sum+Number(w.availableBalance),0),pending=t.withdrawals.filter(w=>["PENDING","UNDER_REVIEW","APPROVED","PROCESSING"].includes(w.status)).length;
  const base=(process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000").replace(/\/$/,"");
  return <div className="grid gap-6"><header><Link href="/super-admin/tenants" className="sa-muted text-xs font-bold">Tenants /</Link><h1 className="mt-2 text-3xl font-black">{t.name}</h1><p className="sa-muted mt-1 text-sm">{t.slug} · {t.status} · Created {t.createdAt.toLocaleDateString()}</p></header>
    <TenantActions tenantId={t.id} status={t.status} maintenance={Boolean(t.adminSettings?.maintenanceMode)}/>
    <TenantEditForm tenant={{id:t.id,name:t.name,slug:t.slug,description:t.adminSettings?.description??""}}/>
    <section className="sa-card p-5"><h2 className="font-black">Inactivity status</h2><p className="sa-muted mt-2 text-sm">{t.inactivityExempt?`Exempt: ${t.inactivityExemptReason}`:t.inactivityReason==="INACTIVITY"?"Temporarily suspended for inactivity":t.inactivityEvaluations[0]?.result??"Not yet evaluated"}</p><p className="sa-muted mt-1 text-xs">Last evaluation: {t.inactivityLastCheckedAt?.toLocaleString()??"Never"} · Last suspension: {t.inactivitySuspendedAt?.toLocaleString()??"Never"} · Last resume: {t.inactivityResumeAt?.toLocaleString()??"Never"}</p>{t.inactivityEvaluations[0]&&<p className="mt-2 text-xs font-bold">{t.inactivityEvaluations[0].legitimateUsers} legitimate users / {t.inactivityEvaluations[0].requiredUsers} required</p>}</section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Users",users.length],["Joined today",users.filter(m=>m.createdAt>=today).length],["Administrators",admins.length],["Wallet liability",`$${liability.toFixed(2)}`],["Pending withdrawals",pending],["Telegram bot",t.botConfiguration?"Configured":"Not configured"],["Ads Galaxy",t.adConfiguration?.miniAppPublicId??"Not configured"],["OxaPay",t.oxaPayCredential?"Connected":"Not connected"]].map(([l,v])=><article className="sa-card p-4" key={l}><p className="text-xl font-black">{v}</p><p className="sa-muted mt-1 text-[10px] font-bold">{l}</p></article>)}</section>
    <section className="grid gap-4 lg:grid-cols-2"><article className="sa-card p-5"><h2 className="font-black">Tenant URLs</h2><a className="mt-3 block break-all text-xs font-bold text-teal-600" href={`${base}/${t.slug}`}>{base}/{t.slug}</a><a className="mt-2 block break-all text-xs font-bold text-teal-600" href={`${base}/${t.slug}/admin`}>{base}/{t.slug}/admin</a></article>
    <article className="sa-card p-5"><h2 className="font-black">Administrators</h2><div className="mt-3 grid gap-2">{admins.map(a=><Link key={a.id} href={`/super-admin/administrators/${a.userId}`} className="rounded-xl bg-[var(--sa-surface-2)] p-3 text-xs font-bold">{a.user.firstName} {a.user.lastName} · {a.status}</Link>)}{!admins.length&&<p className="sa-muted text-xs">No tenant Administrator assigned.</p>}</div></article></section>
    <section className="sa-card p-5"><h2 className="font-black">Recent activity</h2><div className="mt-4 grid gap-3">{t.auditLogs.map(a=><div key={a.id} className="border-b border-[var(--sa-border)] pb-3"><p className="text-xs font-black">{a.action.replaceAll("_"," ")}</p><p className="sa-muted text-[10px]">{a.actor?.username??a.actor?.firstName??"Public applicant"} · {a.createdAt.toLocaleString()}</p></div>)}</div></section>
  </div>
}
