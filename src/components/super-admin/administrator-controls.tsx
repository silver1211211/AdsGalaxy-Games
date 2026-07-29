"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function AdministratorAssignment({ users, tenants }: {
  users: { id: string; label: string }[];
  tenants: { id: string; label: string }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [userId, setUser] = useState("");
  const [tenantId, setTenant] = useState("");
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  async function assign() {
    const response = await fetch("/api/super-admin/administrators", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, tenantId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error ?? "Could not assign.");
    if (body.temporaryPassword) {
      setTemporaryPassword(body.temporaryPassword);
      setMessage("Save this temporary password now. It cannot be retrieved later.");
      router.refresh();
      return;
    }
    ref.current?.close();
    router.refresh();
  }
  function close() {
    ref.current?.close();
    setTemporaryPassword("");
    setMessage("");
  }
  return <><button className="game-primary" onClick={() => ref.current?.showModal()}><Plus size={16} />Assign Administrator</button><dialog ref={ref} className="m-auto w-[min(30rem,calc(100%-1rem))] rounded-3xl bg-[var(--sa-surface)] p-5 text-[var(--sa-text)] shadow-2xl backdrop:bg-slate-950/60"><h2 className="text-xl font-black">Assign Administrator</h2>{temporaryPassword ? <div className="mt-4"><p className="text-xs font-black uppercase text-coral-500">Temporary password — shown once</p><code className="mt-2 block break-all rounded-xl bg-[var(--sa-surface-2)] p-4 text-lg font-black">{temporaryPassword}</code></div> : <><label className="mt-4 block text-xs font-bold">User<select value={userId} onChange={(event) => setUser(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--sa-surface)] px-3"><option value="">Select user</option>{users.map((user) => <option value={user.id} key={user.id}>{user.label}</option>)}</select></label><label className="mt-3 block text-xs font-bold">Tenant<select value={tenantId} onChange={(event) => setTenant(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--sa-surface)] px-3"><option value="">Select tenant</option>{tenants.map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.label}</option>)}</select></label></>}<p className="mt-2 text-xs text-coral-500">{message}</p><div className="mt-4 flex justify-end gap-2"><button className="game-secondary" onClick={close}>{temporaryPassword ? "Done" : "Cancel"}</button>{!temporaryPassword && <button disabled={!userId || !tenantId} className="game-primary disabled:opacity-50" onClick={() => void assign()}>Assign</button>}</div></dialog></>;
}

export function AdministratorActions({ adminId, suspended }: { adminId: string; suspended: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function act(action: "SUSPEND" | "RESTORE" | "REVOKE_SESSIONS") {
    const response = await fetch(`/api/super-admin/administrators/${adminId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: "Super Admin security operation" }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Action completed." : body.error ?? "Action failed.");
    if (response.ok) router.refresh();
  }
  return <div><div className="flex flex-wrap gap-2"><button className="game-secondary" onClick={() => void act(suspended ? "RESTORE" : "SUSPEND")}>{suspended ? "Restore Administrator" : "Suspend Administrator"}</button><button className="game-secondary" onClick={() => void act("REVOKE_SESSIONS")}>Revoke all sessions</button></div><p className="mt-2 text-xs text-coral-500">{message}</p></div>;
}

export function AdministratorPasswordReset({ adminId, membershipId, locked }: {
  adminId: string; membershipId: string; locked: boolean;
}) {
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"GENERATE" | "MANUAL">("GENERATE");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  async function submit(action: "RESET" | "CLEAR_LOCKOUT") {
    setMessage("");
    const response = await fetch(`/api/super-admin/administrators/${adminId}/password-reset`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action, membershipId, reason, confirmed: true,
        ...(action === "RESET" ? { mode, ...(mode === "MANUAL" ? { temporaryPassword: password, confirmPassword: confirm } : {}) } : {}),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error ?? "Security action failed.");
    if (body.temporaryPassword) setResult(body.temporaryPassword);
    else setMessage("Lockout cleared.");
  }
  if (result) return <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-900">Temporary password — shown once</p><code className="mt-2 block break-all text-lg font-black text-amber-950">{result}</code><p className="mt-2 text-xs text-amber-900">Transfer it securely. The Administrator must change it on first access.</p></div>;
  return <div className="grid gap-3"><h2 className="font-black">Password security</h2><p className="sa-muted text-xs">A reset affects this Administrator across assigned tenants. Existing passwords can never be revealed.</p><label className="text-xs font-bold">Reset reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border bg-[var(--sa-surface)] p-3" /></label><div className="flex flex-wrap gap-2"><button className={mode === "GENERATE" ? "game-primary" : "game-secondary"} onClick={() => setMode("GENERATE")}>Generate secure password</button><button className={mode === "MANUAL" ? "game-primary" : "game-secondary"} onClick={() => setMode("MANUAL")}>Enter manually</button></div>{mode === "MANUAL" && <div className="grid gap-2"><input type="password" autoComplete="new-password" placeholder="Temporary password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-xl border bg-[var(--sa-surface)] px-3" /><input type="password" autoComplete="new-password" placeholder="Confirm temporary password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="min-h-11 rounded-xl border bg-[var(--sa-surface)] px-3" /></div>}<div className="flex flex-wrap gap-2"><button disabled={reason.trim().length < 10} className="game-primary disabled:opacity-50" onClick={() => void submit("RESET")}>Reset Administrator Password</button>{locked && <button disabled={reason.trim().length < 10} className="game-secondary disabled:opacity-50" onClick={() => void submit("CLEAR_LOCKOUT")}>Clear lockout</button>}</div><p className="text-xs font-bold text-coral-500">{message}</p></div>;
}
