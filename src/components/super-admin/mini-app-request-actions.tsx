"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MiniAppRequestActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [administratorTelegramId, setAdministratorTelegramId] = useState("");
  const [result, setResult] = useState("");
  const [approvalComplete, setApprovalComplete] = useState(false);

  async function transition(action: string) {
    if (["REQUEST_INFORMATION", "REJECT"].includes(action) && message.trim().length < 10)
      return setResult("Enter a public message of at least 10 characters.");
    if (!confirm(`Confirm ${action.replaceAll("_", " ").toLowerCase()}?`)) return;
    const response = await fetch(`/api/super-admin/mini-app-requests/${requestId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, publicMessage: message || undefined, privateNote: privateNote || undefined }),
    });
    const body = await response.json();
    setResult(response.ok ? "Request updated." : body.error);
    if (response.ok) router.refresh();
  }

  async function approve() {
    if (!/^\d{5,20}$/.test(administratorTelegramId))
      return setResult("Enter the verified numeric Telegram ID for the intended Administrator.");
    if (!confirm("Approve this request and assign this verified identity as Administrator?")) return;
    const response = await fetch(`/api/super-admin/mini-app-requests/${requestId}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ administratorTelegramId }),
    });
    const body = await response.json();
    if (!response.ok) {
      setResult(body.error + (body.diagnosticReference ? ` (${body.diagnosticReference})` : ""));
      return;
    }
    setResult([
      `Public: ${body.urls.miniApp}`,
      `Admin: ${body.urls.admin}`,
      `Login: ${body.urls.login}`,
      body.temporaryPassword
        ? `Temporary password (shown once): ${body.temporaryPassword}`
        : "Existing Administrator credential retained.",
      "Telegram access remains pending until the tenant bot is configured.",
    ].join(" · "));
    setApprovalComplete(true);
  }

  if (approvalComplete)
    return <section className="sa-card p-5"><h2 className="text-lg font-black">Tenant approved</h2><p className="mt-3 break-words text-sm font-bold text-coral-500">{result}</p><p className="sa-muted mt-3 text-xs">Record and transfer any temporary password securely now. It will not be shown again after leaving or reloading this page.</p></section>;
  if (["APPROVED", "REJECTED", "CANCELED", "EXPIRED"].includes(status))
    return <p className="sa-muted text-sm">This request has reached a terminal state.</p>;
  return <section className="sa-card p-5">
    <h2 className="text-lg font-black">Review actions</h2>
    <p className="sa-muted mt-1 text-xs">Approval requires an explicitly verified Administrator identity. A Telegram bot can be configured later.</p>
    <label className="mt-4 grid gap-1 text-xs font-bold">
      Administrator numeric Telegram ID
      <input value={administratorTelegramId} onChange={(event) => setAdministratorTelegramId(event.target.value.replace(/\D/g, "").slice(0, 20))} inputMode="numeric" className="rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-3" />
    </label>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-bold">Public message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-3" /></label>
      <label className="grid gap-1 text-xs font-bold">Private review note<textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} rows={4} className="rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-3" /></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {status === "SUBMITTED" && <button onClick={() => void transition("START_REVIEW")} className="game-secondary">Start Review</button>}
      <button onClick={() => void transition("REQUEST_INFORMATION")} className="game-secondary">Request Information</button>
      <button onClick={() => void approve()} className="game-primary">Approve</button>
      <button onClick={() => void transition("REJECT")} className="rounded-xl bg-coral-500 px-4 py-3 text-sm font-black text-white">Reject</button>
      <button onClick={() => void transition("CANCEL")} className="px-4 py-3 text-sm font-black">Cancel</button>
    </div>
    <p className="mt-3 break-words text-sm font-bold text-coral-500">{result}</p>
  </section>;
}
