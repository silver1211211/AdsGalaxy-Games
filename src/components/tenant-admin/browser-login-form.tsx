"use client";
import { useState } from "react";
import { PlatformPopup } from "@/components/system/platform-popup";
import { parseBrowserLoginResponse } from "@/components/super-admin/login-response";

export function TenantAdministratorLoginForm({ tenantName, tenantSlug }: { tenantName: string; tenantSlug: string }) {
  const [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/${encodeURIComponent(tenantSlug)}/admin/browser-login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const body = await parseBrowserLoginResponse(response);
      if (!response.ok || !body.destination) return setError(body.error ?? "Sign-in could not be completed. Try again.");
      location.assign(body.destination);
    } catch { setError("The secure login service could not be reached. Try again."); }
    finally { setBusy(false); }
  }
  return <><main className="grid min-h-dvh place-items-center px-4 py-10"><section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-float"><p className="text-xs font-black uppercase tracking-[.18em] text-teal-700">{tenantName}</p><h1 className="mt-2 text-3xl font-black">Administrator Login</h1><p className="mt-2 text-sm text-warm-600">Enter the secure Administrator password to continue.</p><form onSubmit={submit} className="mt-7 grid gap-5"><label className="grid gap-2 font-bold">Password<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} className="min-h-12 rounded-xl border px-3"/></label><button disabled={busy} className="game-primary min-h-12 disabled:opacity-50">{busy?"Verifying…":"Secure Sign In"}</button></form></section></main>{error&&<PlatformPopup title="Sign-in failed" message={error} dismissible onClose={()=>setError("")} primary={{label:"Try Again",onClick:()=>setError("")}}/>}</>;
}
