"use client";
import { useEffect, useState } from "react";
import { PlatformPopup } from "@/components/system/platform-popup";
import { readClientApiError } from "@/lib/client-api-error";
type Config = {
  configured: boolean;
  tokenMasked?: string;
  botUsername?: string;
  botId?: string;
  configuredAt?: string;
  configuredBy?: string;
};
export function BotSettingsForm({ tenantSlug }: { tenantSlug: string }) {
  const [token, setToken] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [current, setCurrent] = useState<Config | null>(null),
    [message, setMessage] = useState(""),
    [popup, setPopup] = useState<string | null>(null);
  useEffect(() => {
    void fetch(`/api/${tenantSlug}/admin/settings/telegram-bot`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error((await readClientApiError(response, "Could not load bot status.")).error);
        setCurrent(await response.json());
      })
      .catch(() => setMessage("Could not load bot status."));
  }, [tenantSlug]);
  async function save() {
    if (!confirmed) return;
    setMessage("Validating directly with Telegram…");
    const r = await fetch(`/api/${tenantSlug}/admin/settings/telegram-bot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    if (r.ok) {
      const x = await r.json();
      setCurrent(x);
      setToken("");
      setMessage(
        "Bot connected. The encrypted token cannot be changed by an Admin.",
      );
    } else {
      const apiError = await readClientApiError(r, "Could not configure bot.");
      setMessage("");
      setPopup(apiError.error);
    }
  }
  if (!current)
    return <div className="h-52 animate-pulse rounded-3xl bg-white" />;
  return (
    <section className="max-w-2xl rounded-3xl bg-white p-6 shadow-card">
      {current.configured ? (
        <>
          <div className="rounded-2xl bg-teal-50 p-4">
            <p className="text-sm font-black">
              Bot connected · @{current.botUsername ?? "Telegram bot"}
            </p>
            <dl className="mt-3 grid gap-2 text-xs text-teal-900 sm:grid-cols-2">
              <div>
                <dt className="font-bold">Bot ID</dt>
                <dd>{current.botId}</dd>
              </div>
              <div>
                <dt className="font-bold">Token</dt>
                <dd>{current.tokenMasked}</dd>
              </div>
              <div>
                <dt className="font-bold">Configured</dt>
                <dd>
                  {current.configuredAt
                    ? new Date(current.configuredAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Configured by</dt>
                <dd>{current.configuredBy ?? "Admin"}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-4 text-sm text-warm-500">
            For security, Admins cannot reveal, replace, copy, or delete this
            token. Contact the platform owner if it must be replaced.
          </p>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-950">
            After saving, this bot token cannot be changed by an Admin. Contact
            the platform owner to replace it.
          </div>
          <label className="mt-6 block text-xs font-bold">
            Bot token
            <input
              type="password"
              autoComplete="new-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:AA…"
              className="mt-1 min-h-11 w-full rounded-2xl border px-3 text-sm"
            />
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 accent-teal-600"
            />
            <span>
              I understand this token can be saved only once and cannot be
              changed by an Admin.
            </span>
          </label>
          <button
            disabled={!token || !confirmed}
            onClick={() => void save()}
            className="game-primary mt-4 disabled:opacity-40"
          >
            Validate and connect
          </button>
        </>
      )}
      <p aria-live="polite" className="mt-3 text-xs font-bold text-teal-700">
        {message}
      </p>
      {popup && <PlatformPopup title="Bot not connected" message={popup} dismissible onClose={()=>setPopup(null)} primary={{label:"Review bot settings",onClick:()=>setPopup(null)}}/>}
    </section>
  );
}
