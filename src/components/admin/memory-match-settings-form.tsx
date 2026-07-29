"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, Save, ShieldAlert } from "lucide-react";

type Settings = Record<string, string | number | boolean | null>;
const toggles = [
  ["enabled", "Memory Match enabled"], ["specialCardsEnabled", "Special reward cards enabled"],
  ["moneyMatchEnabled", "Money Match enabled"], ["coinMatchEnabled", "Coin Match enabled"],
  ["rewardedAdsEnabled", "Rewarded advertisements enabled"], ["emergencyDisabled", "Emergency reward disable"],
  ["adsEnabled", "Ads Galaxy integration enabled"]
] as const;

export function MemoryMatchSettingsForm({ miniAppId }: { miniAppId?: string }) {
  const [data, setData] = useState<Settings | null>(null);
  const [status, setStatus] = useState("");
  const endpoint = `/api/admin/game-settings/memory-match${miniAppId ? `?miniAppId=${encodeURIComponent(miniAppId)}` : ""}`;
  useEffect(() => { void fetch(endpoint, { cache: "no-store" }).then(async (r) => { if (!r.ok) throw new Error("Unable to load settings"); setData(await r.json() as Settings); }).catch((e) => setStatus(e.message)); }, [endpoint]);
  if (!data) return <div className="grid min-h-52 place-items-center rounded-4xl bg-white shadow-card"><p className="flex items-center gap-2 text-sm text-warm-500"><LoaderCircle className="animate-spin" size={17} />{status || "Loading secure settings…"}</p></div>;
  const set = (key: string, value: string | number | boolean) => setData((current) => ({ ...current!, [key]: value }));
  const number = (key: string, label: string, min?: number, max?: number) => <label className="grid gap-1 text-xs font-bold text-warm-600">{label}<input type="number" min={min} max={max} value={String(data[key] ?? "")} onChange={(e) => set(key, Number(e.target.value))} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm text-ink" /></label>;
  const text = (key: string, label: string, step = "0.01") => <label className="grid gap-1 text-xs font-bold text-warm-600">{label}<input type="number" step={step} value={String(data[key] ?? "")} onChange={(e) => set(key, e.target.value)} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm text-ink" /></label>;
  async function save() {
    setStatus("Saving…");
    const response = await fetch("/api/admin/game-settings/memory-match", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, targetMiniAppId: miniAppId })
    });
    if (!response.ok) { const body = await response.json() as { error?: string }; return setStatus(body.error ?? "Save failed"); }
    setData(await response.json() as Settings); setStatus("Settings saved and audit logged.");
  }
  return <div className="grid gap-4">
    <Section title="General">{toggles.map(([key, label]) => <label key={key} className="flex min-h-11 items-center justify-between rounded-2xl bg-warm-50 px-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={Boolean(data[key])} onChange={(e) => set(key, e.target.checked)} className="h-5 w-5 accent-teal-600" /></label>)}</Section>
    <Section title="Money Match"><div className="grid gap-3 sm:grid-cols-3">{text("moneyRewardAmount", "Wallet reward (USD)")}{text("moneyRewardMin", "Minimum USD")}{text("moneyRewardMax", "Maximum USD")}</div><p className="text-xs text-warm-500">$0.05 is a temporary configurable default, stored as Decimal—not a permanent value.</p></Section>
    <Section title="Coin Match"><div className="grid gap-3 sm:grid-cols-3">{number("coinMultiplierMin", "Minimum (thousandths)", 1200, 1500)}{number("coinMultiplierMax", "Maximum (thousandths)", 1200, 1500)}{number("coinProbabilityEarly", "Level 1–2 probability %", 0, 100)}</div><p className="text-xs text-warm-500">Allowed steps: 1200, 1300, 1400, 1500 (1.2×–1.5×).</p></Section>
    <Section title="Level 8–14 weights"><div className="grid gap-3 sm:grid-cols-3">{number("optionAWeight", "A · one Money %", 0, 100)}{number("optionBWeight", "B · two Money %", 0, 100)}{number("optionCWeight", "C · Money + Coin %", 0, 100)}</div><p className="text-xs font-bold text-warm-500">Current total: {Number(data.optionAWeight) + Number(data.optionBWeight) + Number(data.optionCWeight)}%</p></Section>
    <Section title="Repeat policy"><div className="grid gap-3 sm:grid-cols-2">{["moneyRepeatPolicy", "coinRepeatPolicy"].map((key) => <label key={key} className="grid gap-1 text-xs font-bold text-warm-600">{key === "moneyRepeatPolicy" ? "Money Match" : "Coin Match"}<select value={String(data[key])} onChange={(e) => set(key, e.target.value)} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm">{["ONCE_EVER", "DAILY", "WEEKLY"].map((v) => <option key={v}>{v}</option>)}</select></label>)}</div></Section>
    <Section title="Reward safety"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{number("maxMoneyClaimsUserDay", "Money claims / user / day", 0)}{number("maxCoinClaimsUserDay", "Coin claims / user / day", 0)}{text("maxWalletUserDay", "Wallet USD / user / day")}{text("maxWalletMiniAppDay", "Wallet USD / Mini App / day")}{number("retryCooldownSeconds", "Retry cooldown seconds", 15)}{number("maxAdRetries", "Maximum ad retries", 1)}{number("pendingExpiryMinutes", "Pending expiry minutes", 5)}</div></Section>
    <Section title="Ads Galaxy"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold text-warm-600">Ads Galaxy Mini App ID<input inputMode="numeric" pattern="[0-9]*" value={String(data.adsMiniAppId ?? "")} onChange={(e) => set("adsMiniAppId", e.target.value)} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm" /></label><label className="grid gap-1 text-xs font-bold text-warm-600">Environment<select value={String(data.adsEnvironment)} onChange={(e) => set("adsEnvironment", e.target.value)} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm">{["PRODUCTION_VERIFIED", "SANDBOX", "DEVELOPMENT_MOCK"].map((v) => <option key={v}>{v}</option>)}</select></label></div><p className="text-xs text-warm-500">This public numeric ID is obtained from Ads Galaxy Publisher → Mini Apps.</p><p className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800"><ShieldAlert size={16} />Browser completion never verifies withdrawable money. Production claims remain pending.</p></Section>
    <div className="sticky bottom-3 flex items-center justify-between rounded-3xl bg-ink p-3 text-white shadow-float"><p className="px-2 text-xs text-white/65">{status || "Changes are tenant-scoped."}</p><button onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-2xl bg-teal-600 px-4 text-xs font-extrabold"><Save size={16} />Save settings</button></div>
  </div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="grid gap-3 rounded-4xl bg-white p-5 shadow-card sm:p-6"><h2 className="text-lg font-extrabold">{title}</h2>{children}</section>; }
