"use client";

import { useState } from "react";

export function ChangeAdministratorPasswordForm({
  endpoint,
  successPath,
  forced,
}: {
  endpoint: string;
  successPath: string;
  forced: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) location.assign(successPath);
    else setMessage(body.error ?? "Password could not be changed.");
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 shadow-card">
      {forced && <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
        Your temporary password must be changed before full Administrator access is enabled.
      </p>}
      <div className="grid gap-4">
        <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
        <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
      </div>
      <div className="mt-5 rounded-2xl bg-warm-50 p-4 text-xs leading-5 text-warm-600">
        Use 10–128 characters. Avoid common passwords, repeated sequences, temporary-password patterns, your tenant name, and your Telegram username.
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm font-bold text-coral-600">{message}</p>
      <button disabled={busy || !currentPassword || !newPassword || !confirmPassword} className="game-primary mt-2 justify-center disabled:opacity-50">
        {busy ? "Changing…" : "Change Password"}
      </button>
    </form>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: {
  label: string; value: string; onChange(value: string): void; autoComplete: string;
}) {
  return <label className="text-sm font-bold">{label}<input required type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-warm-200 px-4 outline-none focus:border-teal-600" /></label>;
}
