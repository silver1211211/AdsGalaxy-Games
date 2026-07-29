import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/features/super-admin/auth";
export default async function Games(){
  await requireSuperAdminPage();const today=new Date();today.setHours(0,0,0,0);
  const [memory,quiz,tap,maze,claims,defaults,activeTenants]=await Promise.all([
    prisma.memoryMatchAttempt.groupBy({by:["status"],where:{createdAt:{gte:today}},_count:true}),
    prisma.quizSession.groupBy({by:["status"],where:{createdAt:{gte:today}},_count:true}),
    prisma.tapCollectorSession.groupBy({by:["status"],where:{createdAt:{gte:today}},_count:true}),
    prisma.mazeRunnerAttempt.groupBy({by:["status"],where:{createdAt:{gte:today}},_count:true}),
    prisma.gameRewardClaim.count({where:{createdAt:{gte:today},status:{in:["AD_REQUESTED","BROWSER_COMPLETED","PENDING_VERIFICATION"]}}}),
    prisma.gamePlatformDefault.findMany(),prisma.miniApp.count({where:{status:"ACTIVE"}}),
  ]);
  const games=[["memory-match","Memory Match",memory],["quiz-challenge","Quiz Challenge",quiz],["tap-collector","Catch Rush",tap],["maze-runner","Maze Runner",maze]] as const;
  return <div className="grid gap-6"><header><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">Platform mechanics</p><h1 className="mt-1 text-3xl font-black">Games</h1><p className="sa-muted mt-2 text-sm">Global mechanics and safety controls. Tenant Administrators remain reward-only.</p></header><section className="grid gap-4 lg:grid-cols-3">{games.map(([key,title,groups])=>{const total=groups.reduce((s,g)=>s+g._count,0),completed=groups.find(g=>String(g.status)==="COMPLETED")?._count??0,d=defaults.find(x=>x.gameKey===key);return <article className="sa-card p-5" key={key}><p className="text-xs font-black uppercase text-teal-600">{d?.emergencyDisabled?"Emergency disabled":d?.enabled===false?"Disabled":"Active"}</p><h2 className="mt-2 text-xl font-black">{title}</h2><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Stat l="Sessions today" v={total}/><Stat l="Completion" v={total?`${Math.round(completed/total*100)}%`:"—"}/><Stat l="Pending claims" v={claims}/><Stat l="Tenants" v={activeTenants}/></div><Link className="game-primary mt-4" href={`/super-admin/games/${key}`}>Manage mechanics</Link></article>})}</section></div>
}
function Stat({l,v}:{l:string;v:string|number}){return <div className="rounded-xl bg-[var(--sa-surface-2)] p-3"><p className="sa-muted text-[10px]">{l}</p><p className="mt-1 font-black">{v}</p></div>}
