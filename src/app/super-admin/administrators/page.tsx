import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/features/super-admin/auth";
import { AdministratorAssignment } from "@/components/super-admin/administrator-controls";
export default async function Administrators({searchParams}:{searchParams:Promise<{q?:string}>}){
  await requireSuperAdminPage();const q=(await searchParams).q?.trim().slice(0,80);
  const [items,users,tenants]=await Promise.all([
    prisma.miniAppMembership.findMany({where:{role:"ADMIN",...(q?{OR:[{user:{username:{contains:q,mode:"insensitive"}}},{user:{firstName:{contains:q,mode:"insensitive"}}},{miniApp:{name:{contains:q,mode:"insensitive"}}}]}:{})},include:{user:{include:{appSessions:true}},miniApp:true},orderBy:{createdAt:"desc"},take:50}),
    prisma.user.findMany({where:{status:"ACTIVE"},select:{id:true,firstName:true,lastName:true,username:true},orderBy:{createdAt:"desc"},take:100}),
    prisma.miniApp.findMany({where:{status:{not:"ARCHIVED"}},select:{id:true,name:true,slug:true},orderBy:{name:"asc"}}),
  ]);
  return <div className="grid gap-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Global access</p><h1 className="mt-1 text-3xl font-black">Administrators</h1><p className="sa-muted mt-2 text-sm">Tenant-scoped roles; Super Admin promotion is unavailable here.</p></div><AdministratorAssignment users={users.map(u=>({id:u.id,label:`${u.firstName} ${u.lastName??""} (@${u.username??"no_username"})`}))} tenants={tenants.map(t=>({id:t.id,label:`${t.name} (${t.slug})`}))}/></header><form className="sa-card flex gap-2 p-3"><input name="q" defaultValue={q} placeholder="Search Administrator or tenant" className="min-h-11 min-w-0 flex-1 bg-transparent px-3"/><button className="game-primary">Search</button></form><div className="grid gap-3">{items.map(m=><article className="sa-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_.6fr_.6fr_auto] sm:items-center" key={m.id}><div><p className="font-black">{m.user.firstName} {m.user.lastName}</p><p className="sa-muted text-xs">@{m.user.username??"no_username"}</p></div><p className="text-xs font-black">{m.miniApp.name}</p><p className="text-xs font-black">{m.status}</p><p className="text-xs font-black">{m.user.appSessions.filter(s=>!s.revokedAt&&s.expiresAt>new Date()).length} sessions</p><Link className="sa-icon" href={`/super-admin/administrators/${m.userId}`}><ArrowUpRight size={16}/></Link></article>)}</div></div>
}
