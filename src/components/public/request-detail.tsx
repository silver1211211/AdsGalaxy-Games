"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";

type RequestItem = {
  publicReference: string;
  proposedName: string;
  requestedSlug: string;
  status: string;
  publicStatusMessage: string | null;
  createdMiniApp?: { slug: string } | null;
  messages: Array<{ id: string; senderType: string; message: string; createdAt: string | Date }>;
  adminAccess?: {
    eligible: boolean;
    credentialConfigured: boolean;
    temporaryPasswordActive: boolean;
    mustChangePassword: boolean;
    temporaryPasswordViewed: boolean;
  };
};

export function RequestDetail({ item }: { item: RequestItem }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [viewed, setViewed] = useState(Boolean(item.adminAccess?.temporaryPasswordViewed));
  const [copied, setCopied] = useState(false);

  async function send() {
    const response = await fetch(`/api/mini-app-requests/${item.publicReference}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
    });
    const body = await response.json();
    if (response.ok) location.reload();
    else setStatus(body.error);
  }
  async function reveal() {
    setStatus("");
    const response = await fetch(`/api/mini-app-requests/${item.publicReference}/administrator-password`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus(body.error ?? "Temporary password is unavailable.");
    setViewed(true);
    if (body.temporaryPassword) setTemporaryPassword(body.temporaryPassword);
    else setStatus(body.message);
  }
  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
  }

  return <div className="grid gap-5">
    <section className="rounded-3xl bg-white p-6 shadow-card">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-xs font-black uppercase text-teal-700">{item.publicReference}</p><h1 className="mt-1 text-3xl font-black">{item.proposedName}</h1><p className="break-all text-warm-500">/{item.requestedSlug}</p></div>
        <span className="h-fit rounded-full bg-teal-50 px-4 py-2 text-xs font-black">{item.status.replaceAll("_", " ")}</span>
      </div>
      <p className="mt-5 rounded-2xl bg-warm-50 p-4 text-sm">{item.publicStatusMessage}</p>
      {item.status === "APPROVED" && item.createdMiniApp && <section className="mt-5 rounded-3xl border border-teal-100 bg-teal-50/50 p-5">
        <KeyRound className="text-teal-700" />
        <h2 className="mt-3 text-xl font-black">Administrator access</h2>
        <p className="mt-2 text-sm text-warm-700">Your Mini App has been approved. Administrator access remains bound to your verified account.</p>
        {item.adminAccess?.eligible && !viewed && !item.adminAccess.credentialConfigured && <button onClick={() => void reveal()} className="game-primary mt-4">Show Temporary Password Once</button>}
        {item.adminAccess?.eligible && !viewed && item.adminAccess.credentialConfigured && <button onClick={() => void reveal()} className="game-primary mt-4">Confirm Existing Administrator Credential</button>}
        {temporaryPassword && <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs font-black uppercase text-coral-600">Save this now — it will not be displayed again</p>
          <div className="mt-2 flex items-center justify-between gap-3"><code className="break-all text-lg font-black">{temporaryPassword}</code><button aria-label="Copy temporary password" onClick={() => void copyPassword()} className="game-icon-button">{copied ? <Check /> : <Copy />}</button></div>
        </div>}
        {viewed && !temporaryPassword && <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold">Temporary password already viewed or an existing Administrator password is configured.</p>}
        <div className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-950"><ShieldAlert className="shrink-0" size={18} /><p>You must change a temporary password before managing your Mini App. If it was lost, a Super Admin must issue a reset after identity verification.</p></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href={`/${item.createdMiniApp.slug}`} className="game-primary">Open Mini App</Link><Link href={`/${item.createdMiniApp.slug}/admin`} className="game-secondary">Open Admin</Link></div>
      </section>}
    </section>
    <section className="rounded-3xl bg-white p-6 shadow-card">
      <h2 className="text-xl font-black">Request conversation</h2>
      <div className="mt-4 grid gap-3">{item.messages.map((entry) => <div key={entry.id} className="rounded-2xl bg-warm-50 p-4 text-sm"><b>{entry.senderType.replaceAll("_", " ")}</b><p className="mt-1">{entry.message}</p></div>)}</div>
      {item.status === "INFORMATION_REQUIRED" && <div className="mt-5"><textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32 w-full rounded-2xl border p-4" placeholder="Provide the requested information" /><button onClick={() => void send()} className="game-primary mt-3">Send Response</button></div>}
      <p aria-live="polite" className="mt-2 text-xs font-bold text-coral-600">{status}</p>
    </section>
  </div>;
}
