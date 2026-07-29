"use client";
import { useState } from "react";
export function UserBanButton({
  tenantSlug,
  userId,
  name,
  banned,
}: {
  tenantSlug: string;
  userId: string;
  name: string;
  banned: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function act() {
    if (busy) return;
    let reason: string | undefined;
    if (!banned) {
      if (
        !confirm(
          `Ban ${name} from this Mini App? Their balances and history will be preserved.`,
        )
      )
        return;
      reason = prompt("Short reason for this Mini App ban:")?.trim();
      if (!reason) return;
    } else if (
      !confirm(`Unban ${name}? They will authenticate again normally.`)
    )
      return;
    setBusy(true);
    const r = await fetch(
        `/api/${tenantSlug}/admin/users/${userId}/${banned ? "unban" : "ban"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(banned ? {} : { reason }),
        },
      ),
      body = await r.json().catch(() => ({}));
    if (r.ok) location.reload();
    else {
      setMessage(body.error ?? "Action failed.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        disabled={busy}
        onClick={() => void act()}
        className={`min-h-9 rounded-xl px-3 text-xs font-black disabled:opacity-50 ${banned ? "bg-teal-50 text-teal-800" : "bg-coral-50 text-coral-700"}`}
      >
        {busy ? "Working…" : banned ? "Unban" : "Ban"}
      </button>
      {message && (
        <p className="mt-1 max-w-32 text-[10px] text-coral-600">{message}</p>
      )}
    </div>
  );
}
