"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContextHelp, SUPER_ADMIN_HELP } from "./context-help";

type Value={enabled:boolean;automaticSuspension:boolean;windowDays:number;minimumUsers:number;graceDays:number;warningDays:number;cooldownDays:number;suspensionMessage:string};
export function InactivityPolicyForm({initial}:{initial:Value}){
 const[v,setV]=useState(initial),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),router=useRouter();
 async function request(method:"PATCH"|"POST",body:unknown){setBusy(true);setMessage("");const r=await fetch("/api/super-admin/inactivity",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),b=await r.json().catch(()=>({}));setBusy(false);setMessage(r.ok?(method==="PATCH"?"Policy saved.":`${b.evaluated} tenants evaluated; ${b.suspended} suspended.`):(b.error??"Action failed."));if(r.ok)router.refresh()}
 return <section className="sa-card p-5"><header className="flex items-center gap-2"><div><h2 className="font-black">Tenant inactivity policy</h2><p className="sa-muted mt-1 text-xs">Default: 7 completed days, 10 legitimate users, 14-day grace period.</p></div><ContextHelp content={SUPER_ADMIN_HELP.inactivity}/></header>
 <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {([["windowDays","Evaluation days",1,30],["minimumUsers","Required new users",1,10000],["graceDays","Grace period days",7,180],["warningDays","Warning lead days",0,30],["cooldownDays","Resume cooldown days",1,90]] as const).map(([key,label,min,max])=><label className="text-xs font-bold" key={key}>{label}<input type="number" min={min} max={max} value={v[key]} onChange={e=>setV({...v,[key]:Number(e.target.value)})} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--sa-surface)] px-3"/></label>)}
 </div><label className="mt-3 block text-xs font-bold">Suspension message<textarea rows={2} value={v.suspensionMessage} onChange={e=>setV({...v,suspensionMessage:e.target.value})} className="mt-1 w-full rounded-xl border bg-[var(--sa-surface)] p-3"/></label>
 <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold"><label><input type="checkbox" checked={v.enabled} onChange={e=>setV({...v,enabled:e.target.checked})}/> Policy enabled</label><label><input type="checkbox" checked={v.automaticSuspension} onChange={e=>setV({...v,automaticSuspension:e.target.checked})}/> Automatic suspension enabled</label></div>
 <p className="mt-3 text-xs font-bold text-coral-500">{message}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className="game-primary" onClick={()=>void request("PATCH",v)}>Save policy</button><button disabled={busy} className="game-secondary" onClick={()=>void request("POST",{action:"DRY_RUN"})}>Run dry check</button><button disabled={busy} className="game-secondary" onClick={()=>void request("POST",{action:"RUN"})}>Run inactivity check</button></div></section>
}
