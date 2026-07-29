"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";
type Button = { id: string; label: string; url: string };
type Settings = {
  startMessage: string;
  miniAppButtonText: string;
  inlineButtons: Button[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  startImageConfigured: boolean;
};
const empty: Settings = {
  startMessage: "",
  miniAppButtonText: "Open Mini App",
  inlineButtons: [],
  maintenanceMode: false,
  maintenanceMessage: "",
  startImageConfigured: false,
};
export function GeneralSettingsForm({ tenantSlug }: { tenantSlug: string }) {
  const [s, setS] = useState(empty),
    [message, setMessage] = useState("Loading…"),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/${tenantSlug}/admin/settings`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            response.status === 401 || response.status === 403
              ? "An Admin session is required. Open /dev/access and sign in as Admin."
              : (body.error ?? "Settings could not be loaded."),
          );
        }
        if (active) {
          setS({ ...empty, ...body });
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Settings could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [tenantSlug]);
  function add() {
    setS((current) =>
      current.inlineButtons.length >= 6
        ? current
        : {
            ...current,
            inlineButtons: [
              ...current.inlineButtons,
              { id: crypto.randomUUID(), label: "", url: "https://" },
            ],
          },
    );
    setMessage("");
  }
  function move(i: number, d: number) {
    const next = [...s.inlineButtons],
      j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setS({ ...s, inlineButtons: next });
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage("Saving…");
    const body = {
      startMessage: s.startMessage || null,
      miniAppButtonText: s.miniAppButtonText,
      inlineButtons: s.inlineButtons,
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage || null,
    };
    const r = await fetch(`/api/${tenantSlug}/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      x = await r.json();
    if (r.ok) setS({ ...s, ...x });
    setMessage(
      r.ok
        ? "Settings saved and audit logged."
        : (x.error ?? "Could not save."),
    );
    setBusy(false);
  }
  async function upload(file: File) {
    const body = new FormData();
    body.set("image", file);
    setMessage("Uploading image…");
    const r = await fetch(`/api/${tenantSlug}/admin/settings/start-image`, {
        method: "POST",
        body,
      }),
      x = await r.json();
    if (r.ok) setS({ ...s, startImageConfigured: true });
    setMessage(r.ok ? "Start image saved." : x.error);
  }
  async function removeImage() {
    const r = await fetch(`/api/${tenantSlug}/admin/settings/start-image`, {
      method: "DELETE",
    });
    if (r.ok) setS({ ...s, startImageConfigured: false });
  }
  return (
    <div className="grid gap-5">
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <label className="text-xs font-bold">
          Start message
          <textarea
            value={s.startMessage}
            onChange={(e) => setS({ ...s, startMessage: e.target.value })}
            maxLength={4000}
            rows={7}
            className="mt-1 w-full rounded-2xl border p-3 text-sm whitespace-pre-wrap"
            placeholder="Welcome! Open the Mini App to get started."
          />
        </label>
        <div className="mt-4 rounded-2xl bg-warm-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-warm-400">
            Preview
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {s.startMessage || "Welcome! Open the Mini App to get started."}
          </p>
          <span className="mt-3 inline-block rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">
            {s.miniAppButtonText || "Open Mini App"}
          </span>
        </div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-black">Start image</h2>
        <p className="mt-1 text-xs text-warm-500">
          Optional PNG, JPEG, or WEBP image up to 3 MB.
        </p>
        {s.startImageConfigured && (
          <img
            src={`/api/${tenantSlug}/admin/settings/start-image`}
            alt="Current start image"
            className="mt-4 max-h-48 rounded-2xl object-cover"
          />
        )}
        <div className="mt-4 flex gap-2">
          <label className="game-secondary cursor-pointer">
            <Upload size={16} />
            Upload
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) =>
                e.target.files?.[0] && void upload(e.target.files[0])
              }
            />
          </label>
          {s.startImageConfigured && (
            <button
              type="button"
              onClick={() => void removeImage()}
              className="game-secondary text-coral-700"
            >
              Remove
            </button>
          )}
        </div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <label className="text-xs font-bold">
          Mini App button text
          <input
            value={s.miniAppButtonText}
            maxLength={40}
            onChange={(e) => setS({ ...s, miniAppButtonText: e.target.value })}
            className="mt-1 min-h-11 w-full rounded-2xl border px-3 text-sm"
          />
        </label>
        <p className="mt-2 text-xs text-warm-500">
          The destination is generated by the platform and cannot be changed.
        </p>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black">Inline buttons</h2>
            <p className="text-xs text-warm-500">
              Optional safe links shown below the Mini App button.
            </p>
          </div>
          <button
            type="button"
            aria-label="Add inline button"
            onClick={add}
            disabled={s.inlineButtons.length >= 6}
            className="game-secondary"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {s.inlineButtons.map((b, i) => (
            <div
              key={b.id}
              className="grid gap-2 rounded-2xl bg-warm-50 p-3 sm:grid-cols-[.7fr_1.3fr_auto]"
            >
              <input
                aria-label="Button name"
                value={b.label}
                onChange={(e) =>
                  setS({
                    ...s,
                    inlineButtons: s.inlineButtons.map((x) =>
                      x.id === b.id ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                placeholder="Button name"
                className="min-h-11 rounded-xl border px-3 text-sm"
              />
              <input
                aria-label="Button URL"
                value={b.url}
                onChange={(e) =>
                  setS({
                    ...s,
                    inlineButtons: s.inlineButtons.map((x) =>
                      x.id === b.id ? { ...x, url: e.target.value } : x,
                    ),
                  })
                }
                placeholder="https://t.me/…"
                className="min-h-11 min-w-0 rounded-xl border px-3 text-sm"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(i, -1)}
                  className="game-icon-button"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(i, 1)}
                  className="game-icon-button"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Remove button"
                  onClick={() =>
                    setS({
                      ...s,
                      inlineButtons: s.inlineButtons.filter(
                        (x) => x.id !== b.id,
                      ),
                    })
                  }
                  className="game-icon-button text-coral-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <label className="flex min-h-11 items-center justify-between gap-4 font-black">
          Maintenance mode
          <input
            type="checkbox"
            checked={s.maintenanceMode}
            onChange={(e) => setS({ ...s, maintenanceMode: e.target.checked })}
            className="h-6 w-6 accent-teal-600"
          />
        </label>
        <label className="mt-4 block text-xs font-bold">
          Maintenance message
          <textarea
            value={s.maintenanceMessage}
            onChange={(e) => setS({ ...s, maintenanceMessage: e.target.value })}
            maxLength={300}
            rows={3}
            className="mt-1 w-full rounded-2xl border p-3 text-sm"
          />
        </label>
      </section>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="game-primary sticky bottom-3 w-full disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save general settings"}
      </button>
      <p
        aria-live="polite"
        className="text-center text-xs font-bold text-teal-700"
      >
        {message}
      </p>
    </div>
  );
}
