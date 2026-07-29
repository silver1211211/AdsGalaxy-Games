"use client";

import { AlertTriangle, CircleHelp, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Network = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  minimum: string;
  fee: string;
  confirmations: number | null;
  memoSupported: boolean;
  automaticEligible: boolean;
  enabled: boolean;
};
type Currency = {
  symbol: string;
  name: string;
  active: boolean;
  synchronizedAt: string;
  networks: Network[];
};
type Data = {
  mode: "MANUAL" | "OXAPAY_AUTOMATIC";
  credential: {
    configured: boolean;
    masked?: string;
    configuredAt?: string;
    lastSuccessfulVerification?: string;
    lastFailedVerification?: string;
  };
  platform: {
    signupUrl: string | null;
    signupLabel: string;
    signupHelp: string;
    automaticAvailable: boolean;
    catalogSynchronizedAt: string | null;
  };
  catalog: Currency[];
};

export function OxaPaySettings({ tenantSlug }: { tenantSlug: string }) {
  const endpoint = `/api/${tenantSlug}/admin/wallet/oxapay`;
  const [data, setData] = useState<Data | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [modeChanging, setModeChanging] = useState(false);
  const [pendingMode, setPendingMode] = useState<Data["mode"] | null>(null);
  const modeDialogRef = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setData(body);
    else setMessage(body.error ?? "Could not load OxaPay settings.");
  }, [endpoint]);
  useEffect(() => {
    void load();
  }, [load]);

  async function connect() {
    if (connecting || !apiKey.trim() || !confirmed) return;
    setConnecting(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), confirm: true }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        connection?: Data["credential"];
        error?: string | { message?: string };
      } | null;
      if (!response.ok || !body?.connection) {
        const serverMessage =
          typeof body?.error === "string"
            ? body.error
            : body?.error?.message;
        setMessage(
          serverMessage ??
            (response.status === 401
              ? "Sign in before connecting OxaPay."
              : response.status === 403
                ? "Please verify your Admin session before connecting OxaPay."
                : response.status === 429
                  ? "Too many connection attempts. Please try again later."
                  : "Unable to connect OxaPay. The server returned an unexpected response."),
        );
        return;
      }
      setData((current) =>
        current ? { ...current, credential: body.connection! } : current,
      );
      setApiKey("");
      setConfirmed(false);
      setMessage("OxaPay connected securely.");
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "The connection request timed out. Nothing was saved. Please try again."
          : "Unable to reach the server. Nothing was saved. Please try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setConnecting(false);
    }
  }
  function requestModeChange(mode: Data["mode"]) {
    if (mode === data?.mode) return;
    setPendingMode(mode);
    modeDialogRef.current?.showModal();
  }
  function closeModeDialog() {
    modeDialogRef.current?.close();
    setPendingMode(null);
  }
  async function setMode(mode: Data["mode"]) {
    if (modeChanging) return;
    setModeChanging(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, confirm: true }),
      });
      const body = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? "Withdrawal mode changed and audit logged."
          : (body?.error ?? "Could not change the withdrawal mode."),
      );
      if (response.ok) await load();
    } catch {
      setMessage("Unable to reach the server. The withdrawal mode was not changed.");
    } finally {
      setModeChanging(false);
      closeModeDialog();
    }
  }
  async function action(path: string) {
    setMessage(
      path === "sync"
        ? "Synchronizing the provider catalog…"
        : "Testing the OxaPay connection…",
    );
    const response = await fetch(`${endpoint}/${path}`, { method: "POST" });
    const body = await response.json();
    setMessage(
      response.ok
        ? path === "sync"
          ? `Catalog synchronized (${body.currencies} currencies).`
          : "Connection verified. No payout was created."
        : body.error,
    );
    if (response.ok) await load();
  }
  async function toggle(networkId: string, enabled: boolean) {
    const response = await fetch(`${endpoint}/assets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ networkId, enabled }),
    });
    const body = await response.json();
    setMessage(
      response.ok ? "Payout option updated and audit logged." : body.error,
    );
    if (response.ok) await load();
  }
  if (!data)
    return (
      <p className="rounded-3xl bg-white p-6 shadow-card">
        {message || "Loading OxaPay settings…"}
      </p>
    );
  const catalog = data.catalog.filter((currency) =>
    `${currency.symbol} ${currency.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const stale =
    data.platform.catalogSynchronizedAt &&
    Date.now() - new Date(data.platform.catalogSynchronizedAt).getTime() >
      48 * 60 * 60 * 1000;
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-2">
        {[
          [
            "MANUAL",
            "Manual Withdrawal",
            "Withdrawal requests are reviewed and processed manually by your Admin team.",
          ],
          [
            "OXAPAY_AUTOMATIC",
            "Automatic OxaPay Withdrawal",
            "Approved withdrawal requests are sent automatically through your connected OxaPay Payout API.",
          ],
        ].map(([mode, title, description]) => (
          <button
            key={mode}
            type="button"
            onClick={() => requestModeChange(mode as Data["mode"])}
            className={`min-h-32 rounded-3xl p-5 text-left shadow-card ${data.mode === mode ? "bg-teal-600 text-white ring-4 ring-teal-100" : "bg-white"}`}
          >
            <span className="font-black">{title}</span>
            <span className="mt-2 block text-xs leading-5 opacity-80">
              {description}
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-black">Connection</h2>
            <p className="mt-1 text-xs text-warm-500">
              OxaPay Payout API Key — generate it in the Payout Service section,
              not Merchant Service.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${data.credential.configured ? "bg-teal-50 text-teal-800" : "bg-warm-100"}`}
          >
            {data.credential.configured ? "Connected" : "Not connected"}
          </span>
        </div>
        {data.credential.configured ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Masked key" value={data.credential.masked ?? "••••"} />
            <Stat
              label="Configured"
              value={
                data.credential.configuredAt
                  ? new Date(data.credential.configuredAt).toLocaleString()
                  : "—"
              }
            />
            <Stat
              label="Last verified"
              value={
                data.credential.lastSuccessfulVerification
                  ? new Date(
                      data.credential.lastSuccessfulVerification,
                    ).toLocaleString()
                  : "Not tested"
              }
            />
          </div>
        ) : null}
        <label className="mt-5 block text-xs font-bold">
          {data.credential.configured
            ? "Replacement Payout API key"
            : "Payout API key"}
          <input
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border px-3"
          />
        </label>
        <label className="mt-3 flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-5 w-5 accent-teal-600"
          />
          <span>
            I confirm this is a Payout API key and understand replacing it
            affects future payouts.
          </span>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!apiKey.trim() || !confirmed || connecting}
            onClick={() => void connect()}
            className="game-primary disabled:opacity-40"
          >
            {connecting
              ? "Connecting…"
              : data.credential.configured
                ? "Replace Key"
                : "Connect OxaPay"}
          </button>
          {data.credential.configured && (
            <button
              onClick={() => void action("test")}
              className="game-secondary"
            >
              Test Connection
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-black">Supported payout assets</h2>
            <p className="mt-1 text-xs text-warm-500">
              Live OxaPay catalog. Volatile assets are manual-only until a
              trusted price source is configured.
            </p>
          </div>
          <button
            onClick={() => void action("sync")}
            className="game-secondary"
          >
            <RefreshCw size={15} />
            Synchronize
          </button>
        </div>
        {stale && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
            Catalog data is stale. The last valid catalog remains available.
          </p>
        )}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search currencies"
          className="mt-4 min-h-11 w-full rounded-xl border px-3"
        />
        <div className="mt-4 grid gap-3">
          {catalog.map((currency) => (
            <article
              key={currency.symbol}
              className="rounded-2xl border border-warm-100 p-4"
            >
              <h3 className="font-black">
                {currency.symbol}{" "}
                <span className="font-normal text-warm-500">
                  · {currency.name}
                </span>
              </h3>
              <div className="mt-3 grid gap-2">
                {currency.networks.map((network) => (
                  <label
                    key={network.id}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-warm-50 p-3"
                  >
                    <span className="min-w-0 text-xs">
                      <strong className="block truncate">{network.name}</strong>
                      <span className="text-warm-500">
                        Minimum {network.minimum} {currency.symbol} · fee{" "}
                        {network.fee} ·{" "}
                        {network.automaticEligible
                          ? "Automatic eligible"
                          : "Manual only"}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={network.enabled}
                      disabled={!network.active}
                      onChange={(event) =>
                        void toggle(network.id, event.target.checked)
                      }
                      className="h-6 w-6 shrink-0 accent-teal-600"
                    />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!catalog.length && (
          <p className="mt-4 rounded-xl bg-warm-50 p-4 text-sm text-warm-500">
            Synchronize to load OxaPay-supported currencies and networks.
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-teal-50 p-5 text-teal-950">
        <h2 className="flex items-center gap-2 font-black">
          <CircleHelp size={18} />
          Don&apos;t have an OxaPay account?
        </h2>
        <p className="mt-2 text-xs leading-5">{data.platform.signupHelp}</p>
        {data.platform.signupUrl ? (
          <a
            href={data.platform.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="game-primary mt-4"
          >
            {data.platform.signupLabel}
          </a>
        ) : (
          <p className="mt-3 text-xs font-bold">
            OxaPay signup link is not currently configured.
          </p>
        )}
      </section>
      <p
        aria-live="polite"
        className="text-center text-xs font-bold text-coral-700"
      >
        {message}
      </p>
      <dialog
        ref={modeDialogRef}
        aria-labelledby="withdrawal-mode-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeModeDialog();
        }}
        onClose={() => setPendingMode(null)}
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        <div className="flex items-start justify-between gap-3 border-b border-warm-100 p-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle aria-hidden="true" size={21} />
            </span>
            <div>
              <h2
                id="withdrawal-mode-dialog-title"
                className="text-lg font-black"
              >
                Change withdrawal mode?
              </h2>
              <p className="mt-2 text-xs leading-5 text-warm-500">
                Existing pending requests will not be submitted automatically.
                New requests will follow the selected processing mode.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModeDialog}
            aria-label="Close confirmation"
            className="game-icon-button shrink-0"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModeDialog}
            className="game-secondary"
          >
            Keep current mode
          </button>
          <button
            type="button"
            disabled={!pendingMode || modeChanging}
            onClick={() => pendingMode && void setMode(pendingMode)}
            className="game-primary disabled:opacity-50"
          >
            {modeChanging ? "Changing…" : "Confirm change"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-warm-50 p-3">
      <p className="text-[10px] font-bold uppercase text-warm-400">{label}</p>
      <p className="mt-1 break-all text-xs font-black">{value}</p>
    </div>
  );
}
