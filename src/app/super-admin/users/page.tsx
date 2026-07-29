import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { maskedTelegramId } from "@/features/super-admin/policy";
import { requireSuperAdminPage } from "@/features/super-admin/auth";
export default async function UsersPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
  await requireSuperAdminPage();
  const p=await searchParams,q=p.q?.trim().slice(0,80),page=Math.max(1,Number(p.page??1)||1),take=25;
  const telegram=/^\d+$/.test(q??"")?BigInt(q!):undefined,where=q?{OR:[{id:q},{username:{contains:q,mode:"insensitive" as const}},{firstName:{contains:q,mode:"insensitive" as const}},{lastName:{contains:q,mode:"insensitive" as const}},...(telegram?[{telegramId:telegram}]:[])]}:{};
  const [items,total]=await Promise.all([prisma.user.findMany({where,include:{memberships:true,wallets:true},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),prisma.user.count({where})]);
  return <div className="grid gap-6"><header><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Global identity directory</p><h1 className="mt-1 text-3xl font-black">Users</h1><p className="sa-muted mt-2 text-sm">{total} unique global users. Tenant memberships and balances remain independently scoped.</p></header><form className="sa-card flex gap-2 p-3"><input name="q" defaultValue={q} placeholder="Search name, username, Telegram ID, or global ID" className="min-h-11 min-w-0 flex-1 bg-transparent px-3"/><button className="game-primary">Search</button></form><div className="grid gap-3">{items.map(u=><article className="sa-card grid gap-3 p-4 md:grid-cols-[1.2fr_.7fr_.6fr_.7fr_.6fr_auto] md:items-center" key={u.id}><div><p className="font-black">{u.firstName} {u.lastName}</p><p className="sa-muted text-xs">@{u.username??"no_username"} · {maskedTelegramId(u.telegramId)}</p></div><Datum l="Memberships" v={u.memberships.length}/><Datum l="Active" v={u.memberships.filter(m=>m.status==="ACTIVE").length}/><Datum l="Available" v={`$${u.wallets.reduce((s,w)=>s+Number(w.availableBalance),0).toFixed(2)}`}/><Datum l="Status" v={u.status}/><Link className="sa-icon" href={`/super-admin/users/${u.id}`}><ArrowUpRight size={16}/></Link></article>)}</div><p className="sa-muted text-center text-xs">Page {page} of {Math.max(1,Math.ceil(total/take))}</p></div>
}
function Datum({l,v}:{l:string;v:string|number}){return <div><p className="sa-muted text-[10px]">{l}</p><p className="text-xs font-black">{v}</p></div>}
