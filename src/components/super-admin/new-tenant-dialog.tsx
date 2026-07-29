"use client";
import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeTenantSlug } from "@/features/super-admin/policy";

export function NewTenantDialog(){
  const ref=useRef<HTMLDialogElement>(null),router=useRouter();
  const [name,setName]=useState(""),[slug,setSlug]=useState(""),[description,setDescription]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function create(){
    if(busy)return;setBusy(true);setMessage("");
    try{const response=await fetch("/api/super-admin/tenants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,slug:normalizeTenantSlug(slug),description:description||undefined,status:"ACTIVE"})}),body=await response.json().catch(()=>({}));
      if(!response.ok)return setMessage(body.error??"Could not create tenant.");
      ref.current?.close();setName("");setSlug("");setDescription("");router.refresh();
    }catch{setMessage("Unable to reach the server.")}finally{setBusy(false)}
  }
  return <><button type="button" onClick={()=>ref.current?.showModal()} className="game-primary"><Plus size={16}/>New Tenant</button>
    <dialog ref={ref} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-1rem))] overflow-y-auto rounded-3xl bg-[var(--sa-surface)] p-0 text-[var(--sa-text)] shadow-2xl backdrop:bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-[var(--sa-border)] p-5"><div><h2 className="text-xl font-black">Create tenant</h2><p className="sa-muted text-xs">Creates one database tenant in the shared application.</p></div><button className="sa-icon" onClick={()=>ref.current?.close()}><X/></button></div>
      <div className="grid gap-4 p-5"><Field label="Display name" value={name} onChange={v=>{setName(v);if(!slug)setSlug(normalizeTenantSlug(v))}}/><Field label="Tenant slug" value={slug} onChange={setSlug}/><label className="text-xs font-bold">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-3"/></label>
      <div className="rounded-xl bg-[var(--sa-surface-2)] p-3 text-xs"><p className="break-all">/{normalizeTenantSlug(slug)}</p><p className="break-all">/{normalizeTenantSlug(slug)}/admin</p></div>
      <p aria-live="polite" className="text-xs font-bold text-coral-500">{message}</p>
      <div className="flex justify-end gap-2"><button className="game-secondary" onClick={()=>ref.current?.close()}>Cancel</button><button disabled={busy||!name||!slug} className="game-primary disabled:opacity-50" onClick={()=>void create()}>{busy?"Creating…":"Create Tenant"}</button></div></div>
    </dialog></>
}
function Field({label,value,onChange}:{label:string;value:string;onChange(v:string):void}){return <label className="text-xs font-bold">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] px-3"/></label>}
