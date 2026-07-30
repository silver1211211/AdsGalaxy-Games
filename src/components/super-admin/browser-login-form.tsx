"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PlatformPopup } from "@/components/system/platform-popup";

export function SuperAdminBrowserLoginForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/browser-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Invalid password or account unavailable.");
        return;
      }
      location.assign(body.destination);
    } catch {
      setError("The secure login service could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="sa-root grid min-h-dvh place-items-center px-4 py-10">
        <section className="sa-card w-full max-w-md p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="sa-logo"><ShieldCheck size={22} /></span>
            <div>
              <p className="font-black">Ads Galaxy</p>
              <p className="sa-muted text-[10px] font-bold uppercase tracking-[.16em]">
                Secure Super Admin access
              </p>
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-black">Super Admin Login</h1>
          <p className="sa-muted mt-2 text-sm leading-6">
            Enter the secure platform password to continue.
          </p>
          <form onSubmit={submit} className="mt-7 grid gap-5">
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 rounded-xl border bg-white px-3 text-ink"
                required
              />
            </label>
            <button disabled={busy} className="game-primary min-h-12 disabled:opacity-50">
              {busy ? "Verifying…" : "Secure Sign In"}
            </button>
          </form>
          <p className="sa-muted mt-6 text-xs">
            Telegram Mini App authentication is not required for this dashboard.
          </p>
        </section>
      </main>
      {error && (
        <PlatformPopup
          title="Sign-in failed"
          message={error}
          dismissible
          onClose={() => setError("")}
          primary={{ label: "Try Again", onClick: () => setError("") }}
        />
      )}
    </>
  );
}
