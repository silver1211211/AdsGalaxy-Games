"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function AdministratorPasswordForm({
  endpoint,
  nextPath,
  title = "Administrator Verification",
}: {
  endpoint: string;
  nextPath: string;
  title?: string;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) location.assign(body.mustChangePassword ? body.changePasswordPath : nextPath);
    else setMessage(body.error ?? "Administrator verification failed.");
    setBusy(false);
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-warm-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-float">
        <LockKeyhole className="text-teal-700" size={38} />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-warm-600">
          Your verified account identifies you. Enter your Administrator password to open a short-lived protected session.
        </p>
        <label className="mt-6 block text-sm font-bold">
          Administrator password
          <span className="relative mt-2 block">
            <input
              autoFocus
              required
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-warm-200 bg-white px-4 pr-12 outline-none focus:border-teal-600"
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-warm-500"
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm font-bold text-coral-600">{message}</p>
        <button disabled={busy || !password} className="game-primary mt-3 w-full justify-center disabled:opacity-50">
          {busy ? "Verifying…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
