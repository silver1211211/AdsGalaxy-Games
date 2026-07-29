"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Pencil, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PROFILE_ACCOUNT_ITEMS } from "@/features/profile/profile-ui";

type Data = any;
const icons = { "/profile/edit": Pencil, "/profile/preferences": SlidersHorizontal } as const;
export function ProfileDashboard() {
  const [data,setData]=useState<Data>(null),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/profile",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error(r.status===401?"Authentication required. Open this Mini App through Telegram or use local development access.":"Profile is unavailable.");return r.json()}).then(setData).catch(e=>setError(e.message))},[]);
  async function logout(){const r=await fetch("/api/profile/logout",{method:"POST"}),b=await r.json().catch(()=>({}));if(r.ok)location.assign(b.redirect??"/");else setError(b.error??"Logout failed.");}
  if(error)return <div className="mx-auto max-w-xl rounded-4xl bg-white p-8 text-center shadow-card"><ShieldCheck className="mx-auto text-coral-500"/><h1 className="mt-4 text-2xl font-black">Profile unavailable</h1><p className="mt-2 text-sm text-warm-600">{error}</p><Link className="game-primary mt-6" href="/dev/access">Development access</Link></div>;
  if(!data)return <div className="mx-auto max-w-3xl animate-pulse space-y-4"><div className="h-44 rounded-4xl bg-white"/><div className="h-56 rounded-4xl bg-white"/></div>;
  const s=data.stats;
  return <main className="mx-auto max-w-3xl space-y-5 overflow-x-hidden">
    <section className="overflow-hidden rounded-4xl bg-gradient-to-br from-teal-700 to-teal-500 p-5 text-white shadow-float sm:p-7">
      <div className="flex min-w-0 items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/20 text-2xl font-black">{data.identity.avatar?<img className="h-full w-full object-cover" src={data.identity.avatar} alt={`${data.identity.displayName} avatar`}/>:data.identity.initials}</div>
      <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black sm:text-3xl">{data.identity.displayName}</h1><p className="truncate text-sm text-teal-50">{data.identity.telegramUsername?`@${data.identity.telegramUsername}`:"Telegram-linked account"}</p><p className="mt-2 text-[11px] font-extrabold text-teal-100">Joined {new Date(data.membership.joinedAt).toLocaleDateString()}</p></div>
      <Link href="/profile/edit" aria-label="Edit profile" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-teal-700"><Pencil size={19}/></Link></div>
    </section>
    <section aria-label="User statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[[s.points.total,"Points"],[`$${s.wallet.availableBalance}`,"Available"],[s.games.totalCompleted,"Games"],[s.tasks.completed,"Tasks"]].map(([value,label])=><div key={label} className="min-w-0 rounded-3xl bg-white p-4 shadow-card"><p className="truncate text-xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-warm-500">{label}</p></div>)}</section>
    <section aria-label="Account" className="overflow-hidden rounded-4xl bg-white shadow-card"><h2 className="px-5 pt-5 text-lg font-black">Account</h2>{PROFILE_ACCOUNT_ITEMS.map(({href,label})=>{const Icon=icons[href];return <Link key={href} href={href} className="flex min-h-16 items-center gap-3 border-b border-warm-100 px-5 text-sm font-bold last:border-0 hover:bg-warm-50"><Icon size={20} className="text-teal-600"/><span className="flex-1">{label}</span><ChevronRight size={18} className="text-warm-300"/></Link>})}</section>
    <button onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white font-extrabold text-coral-600"><LogOut size={19}/>Log out</button><p aria-live="polite" className="text-center text-sm text-coral-600">{error}</p>
  </main>;
}
