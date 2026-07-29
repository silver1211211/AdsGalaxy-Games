import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NewTenantDialog } from "@/components/super-admin/new-tenant-dialog";
import { requireSuperAdminPage } from "@/features/super-admin/auth";

export default async function TenantsPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
  await requireSuperAdminPage();
  const params=await searchParams,q=params.q?.trim().slice(0,80),page=Math.max(1,Number(params.page??1)||1),take=20;
  const where=q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{slug:{contains:q,mode:"insensitive" as const}},{id:q}]}:{};
  const [items,total]=await Promise.all([
    prisma.miniApp.findMany({where,include:{_count:{select:{memberships:true}},memberships:{where:{role:"ADMIN",status:"ACTIVE"},include:{user:true},take:1},adminSettings:true,botConfiguration:true,adConfiguration:true,oxaPayCredential:true,inactivityEvaluations:{orderBy:{evaluatedAt:"desc"},take:1}},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),
    prisma.miniApp.count({where}),
  ]);
  return <div className="grid gap-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Platform directory</p><h1 className="mt-1 text-3xl font-black">Tenants</h1><p className="sa-muted mt-2 text-sm">{total} database-driven Mini Apps using the shared application.</p></div><NewTenantDialog/></header>
    <form className="sa-card flex gap-2 p-3"><Search className="my-auto ml-2 shrink-0 sa-muted" size={18}/><input name="q" defaultValue={q} placeholder="Search name, slug, or tenant ID" className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"/><button className="game-primary">Search</button></form>
    <div className="grid gap-3">{items.map(t=><article className="sa-card grid gap-4 p-4 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(6rem,.55fr))_auto] md:items-center" key={t.id}>
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--sa-primary-soft)] font-black text-[var(--sa-primary)]">{t.name.slice(0,2).toUpperCase()}</span><div className="min-w-0"><h2 className="truncate font-black">{t.name}</h2><p className="sa-muted truncate text-xs">{t.slug}</p></div></div>
      <Datum label="Status" value={t.adminSettings?.maintenanceMode?"MAINTENANCE":t.status}/><Datum label="Users" value={t._count.memberships}/><Datum label="Administrator" value={t.memberships[0]?.user.username??t.memberships[0]?.user.firstName??"Unassigned"}/>
      <Datum label="Activity" value={t.inactivityExempt?"Exempt":t.inactivityReason==="INACTIVITY"?"Auto suspended":t.inactivityEvaluations[0]?.result??"Not evaluated"}/>
      <Link href={`/super-admin/tenants/${t.id}`} className="sa-icon" aria-label={`View ${t.name}`}><ArrowUpRight size={16}/></Link>
    </article>)}{!items.length&&<div className="sa-card p-10 text-center"><p className="font-black">No tenants found</p><p className="sa-muted mt-1 text-xs">Try a different search or create a tenant.</p></div>}</div>
    <p className="sa-muted text-center text-xs">Page {page} of {Math.max(1,Math.ceil(total/take))}</p>
  </div>
}
function Datum({label,value}:{label:string;value:React.ReactNode}){return <div><p className="sa-muted text-[10px] font-bold uppercase">{label}</p><p className="mt-1 truncate text-xs font-black">{value}</p></div>}
