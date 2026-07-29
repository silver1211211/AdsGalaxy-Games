"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
type Settings = { coinPoints: number; scheduledWalletAmount: string; enabled: boolean };
export function TapSettingsForm() {
  const [data, setData] = useState<Settings | null>(null), [status, setStatus] = useState("");
  useEffect(() => { void fetch("/api/admin/game-settings/tap-collector").then((r) => r.json()).then(setData).catch(() => setStatus("Unable to load.")); }, []);
  if (!data) return <p>{status || "Loading…"}</p>;
  async function save() {
    setStatus("Saving…");
    if (!data) return;
    const current = data;
    const r = await fetch("/api/admin/game-settings/tap-collector", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coinPoints: current.coinPoints, scheduledWalletAmount: current.scheduledWalletAmount }) });
    const body = await r.json(); if (r.ok) setData(body); setStatus(r.ok ? "Rewards saved and audit logged." : body.error);
  }
  return <div className="grid gap-4"><section className="grid gap-4 rounded-3xl bg-white p-5 shadow-card sm:grid-cols-2">
    <label className="grid gap-1 text-sm font-bold">Coin points per collection<input type="number" min="1" max="1000" value={data.coinPoints} onChange={(e) => setData({ ...data, coinPoints: Number(e.target.value) })} className="min-h-11 rounded-xl border px-3" /><small className="font-normal text-warm-500">Points only; this never credits withdrawable money.</small></label>
    <label className="grid gap-1 text-sm font-bold">Money value after verification<input type="number" min="0" max="100" step=".01" value={data.scheduledWalletAmount} onChange={(e) => setData({ ...data, scheduledWalletAmount: e.target.value })} className="min-h-11 rounded-xl border px-3" /><small className="font-normal text-warm-500">Credited only by a future trusted Ads Galaxy callback.</small></label>
  </section><p className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-950">Probabilities, Bomb behavior, speeds, level plans, encounter caps, provider verification and emergency controls are managed by the platform.</p>
  <div className="flex items-center justify-between rounded-3xl bg-ink p-3 text-white"><p className="text-xs">{status}</p><button onClick={() => void save()} className="game-primary"><Save size={16} />Save rewards</button></div></div>;
}
