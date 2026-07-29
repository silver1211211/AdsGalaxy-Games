"use client";
import { useState } from "react";
import { Code2, LogIn, LogOut } from "lucide-react";

type Diagnostic = {
  enabled: boolean; directAccess: boolean; previewActive: boolean; databaseConfigured: boolean;
  databaseReachable: boolean; migrationsAvailable: boolean; sessionValid: boolean; role?: string; miniAppName?: string;
};
const roles = [["USER","User"],["ADMIN","Admin"],["SUPER_ADMIN","Super Admin"]] as const;
const links = [["Games","/games"],["Memory Match","/games/memory-match"],["Quiz","/games/quiz-challenge"],["Catch Rush","/games/tap-collector"],["Wallet","/wallet"],["Tasks","/tasks"],["Admin","/local-development/admin"],["Super Admin","/super-admin"]];

export function DevelopmentAccessForm({next,defaultRole,diagnostic}:{
  next:string; defaultRole:"USER"|"ADMIN"|"SUPER_ADMIN"; diagnostic:Diagnostic
}) {
  const [role,setRole]=useState(defaultRole),[status,setStatus]=useState("");
  async function enter() {
    setStatus("Creating signed local session…");
    const destination=role==="SUPER_ADMIN"?"/super-admin":next==="/games"&&role==="ADMIN"?"/local-development/admin":next;
    const response=await fetch("/api/dev/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role,next:destination})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)return setStatus(body.error??"Local access is unavailable.");
    window.location.assign(body.redirect??destination);
  }
  async function logout(){const r=await fetch("/api/dev/auth/logout",{method:"POST"}),b=await r.json();location.assign(b.redirect??"/dev/access");}
  const ready=diagnostic.enabled&&diagnostic.databaseConfigured&&diagnostic.databaseReachable&&diagnostic.migrationsAvailable;
  return <section className="w-full max-w-xl rounded-4xl bg-white p-6 shadow-float sm:p-8">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-coral-50 text-coral-500"><Code2/></div>
    <h1 className="mt-5 text-3xl font-black">Local Development Access</h1>
    <p className="mt-2 text-sm leading-6 text-warm-600">Creates the same signed application session used by Telegram authentication, available only during local development.</p>
    <div className="mt-5 grid grid-cols-2 gap-2 text-xs">{[["Development auth",diagnostic.enabled],["DATABASE_URL",diagnostic.databaseConfigured],["PostgreSQL",diagnostic.databaseReachable],["Database tables",diagnostic.migrationsAvailable]].map(([label,ok])=><p key={String(label)} className={`rounded-xl p-3 font-bold ${ok?"bg-teal-50 text-teal-800":"bg-amber-50 text-amber-900"}`}>{ok?"✓":"!"} {String(label)}</p>)}</div>
    {!diagnostic.enabled&&<p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900">Local development authentication is disabled. Add ALLOW_DEVELOPMENT_AUTH=true to .env.local and restart the server.</p>}
    {diagnostic.databaseConfigured&&!diagnostic.databaseReachable&&<p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900">PostgreSQL is unavailable. Start PostgreSQL, verify DATABASE_URL, apply the migrations, and retry.</p>}
    {diagnostic.databaseReachable&&!diagnostic.migrationsAvailable&&<p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900">Database tables are missing. Run npx prisma migrate dev and retry.</p>}
    {diagnostic.sessionValid&&<p className="mt-4 rounded-2xl bg-teal-50 p-3 text-xs font-bold text-teal-900">Local development session active · {diagnostic.role} · {diagnostic.miniAppName}</p>}
    <fieldset className="mt-6 grid gap-2"><legend className="mb-2 text-xs font-extrabold uppercase tracking-wider text-warm-500">Test role</legend>{roles.map(([value,label])=><label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-bold ${role===value?"border-teal-500 bg-teal-50":"border-warm-100 bg-warm-50"}`}><input type="radio" name="role" checked={role===value} onChange={()=>setRole(value)} className="accent-teal-600"/>{label}</label>)}</fieldset>
    <div className="mt-5 grid gap-2 sm:grid-cols-2"><button disabled={!ready} onClick={()=>void enter()} className="game-primary justify-center disabled:opacity-40"><LogIn size={17}/>Create {role.replace("_"," ")} session</button><button disabled={!diagnostic.sessionValid} onClick={()=>void logout()} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-warm-100 text-sm font-extrabold disabled:opacity-40"><LogOut size={17}/>Logout local session</button></div>
    <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs font-bold text-coral-600">{status}</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-bold text-teal-700">{links.map(([label,href])=><a key={href} href={href}>{label}</a>)}</div>
  </section>;
}
