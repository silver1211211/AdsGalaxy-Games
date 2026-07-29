"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
type Status={sessionValid:boolean};
export function DevelopmentSessionBanner(){
  const[state,setState]=useState<Status|null>(null),pathname=usePathname();
  useEffect(()=>{if(process.env.NODE_ENV!=="development")return;void fetch("/api/dev/auth/status",{cache:"no-store"}).then(async r=>r.ok?setState(await r.json()):null).catch(()=>null)},[]);
  if(process.env.NODE_ENV!=="development"||!state?.sessionValid)return null;
  if(pathname==="/games/tap-collector/play")return <aside className="pointer-events-none fixed right-2 top-[calc(env(safe-area-inset-top)+3.1rem)] z-50 rounded-full bg-amber-100/90 px-2 py-1 text-[8px] font-black uppercase text-amber-900">Dev</aside>;
  async function exit(){const r=await fetch("/api/dev/auth/logout",{method:"POST"}),b=await r.json();location.assign(b.redirect??"/dev/access")}
  return <aside className="fixed bottom-[calc(5.3rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-extrabold text-amber-900 shadow-card"><span>Local development session</span><button onClick={()=>void exit()} className="rounded-full bg-amber-900 px-2 py-1 text-white">Exit</button></aside>
}
