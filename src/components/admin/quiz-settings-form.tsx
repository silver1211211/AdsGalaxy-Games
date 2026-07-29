"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";

type Settings = Record<string, string | number | boolean | null>;
const toggles = [
  ["enabled", "Quiz Challenge enabled"], ["quickEnabled", "Quick Quiz"], ["classicEnabled", "Classic Quiz"],
  ["categoryEnabled", "Category Challenge"], ["dailyEnabled", "Daily Challenge"], ["soundDefault", "Sound by default"],
  ["explanationsEnabled", "Answer explanations"], ["immediateFeedback", "Immediate feedback"], ["resultReviewEnabled", "Answer review"],
  ["scheduledWalletEnabled", "Scheduled wallet ads"], ["fiftyFiftyEnabled", "50/50 utility"], ["extraTimeEnabled", "Extra-time utility"],
  ["secondChanceEnabled", "Second-chance utility"], ["doublePointsEnabled", "Double-points utility"],
  ["sponsoredLobbyEnabled", "Sponsored lobby slot"], ["emergencyDisabled", "Emergency disable"]
] as const;
const numeric = [
  ["quickQuestionCount", "Quick questions"], ["classicQuestionCount", "Classic questions"], ["categoryQuestionCount", "Category questions"], ["dailyQuestionCount", "Daily questions"],
  ["easyTimeSeconds", "Easy seconds"], ["mediumTimeSeconds", "Medium seconds"], ["hardTimeSeconds", "Hard seconds"],
  ["easyBasePoints", "Easy points"], ["mediumBasePoints", "Medium points"], ["hardBasePoints", "Hard points"],
  ["maxTimeBonusBps", "Max time bonus (bps)"], ["streakStepBps", "Streak step (bps)"], ["maxStreakBonusBps", "Max streak bonus (bps)"],
  ["quickAdPosition", "Quick ad after"], ["classicAdPosition1", "Classic first ad"], ["classicAdPosition2", "Classic second ad"],
  ["categoryAdPosition", "Category ad after"], ["dailyAdPosition", "Daily ad after"],
  ["minSessionBeforeAdSeconds", "Minimum session seconds"], ["minAdIntervalSeconds", "Minimum ad interval seconds"], ["maxScheduledAdsSession", "Max ads/session"]
] as const;

export function QuizSettingsForm() {
  const [data, setData] = useState<Settings | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => { void fetch("/api/admin/game-settings/quiz-challenge", { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error("Unable to load settings"); setData(await r.json()); }).catch(e => setStatus(e.message)); }, []);
  if (!data) return <div className="grid min-h-52 place-items-center rounded-4xl bg-white shadow-card"><span className="flex gap-2 text-sm"><LoaderCircle className="animate-spin" size={17}/>{status || "Loading quiz settings…"}</span></div>;
  const set = (key: string, value: string | number | boolean | null) => setData(current => ({ ...current!, [key]: value }));
  async function save() {
    setStatus("Saving…");
    const response = await fetch("/api/admin/game-settings/quiz-challenge", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) return setStatus(body.error ?? "Save failed");
    setData(body); setStatus("Settings saved and audit logged.");
  }
  return <div className="grid gap-4">
    <section className="grid gap-3 rounded-4xl bg-white p-5 shadow-card"><h2 className="text-lg font-extrabold">Availability and experience</h2><div className="grid gap-2 sm:grid-cols-2">{toggles.map(([key,label]) => <label key={key} className="flex min-h-11 items-center justify-between rounded-2xl bg-warm-50 px-3 text-sm font-bold">{label}<input type="checkbox" checked={Boolean(data[key])} onChange={e => set(key,e.target.checked)} className="h-5 w-5 accent-teal-600"/></label>)}</div></section>
    <section className="grid gap-3 rounded-4xl bg-white p-5 shadow-card"><h2 className="text-lg font-extrabold">Timing, scoring and ad schedule</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{numeric.map(([key,label]) => <label key={key} className="grid gap-1 text-xs font-bold text-warm-600">{label}<input type="number" value={data[key] === null ? "" : String(data[key])} onChange={e => set(key, e.target.value === "" && key === "classicAdPosition2" ? null : Number(e.target.value))} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm"/></label>)}<label className="grid gap-1 text-xs font-bold text-warm-600">Scheduled wallet amount<input type="number" step="0.01" value={String(data.scheduledWalletAmount)} onChange={e => set("scheduledWalletAmount",e.target.value)} className="min-h-11 rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm"/></label></div></section>
    <div className="sticky bottom-3 flex items-center justify-between rounded-3xl bg-ink p-3 text-white shadow-float"><p className="px-2 text-xs text-white/65">{status || "All changes are tenant-scoped."}</p><button onClick={() => void save()} className="game-primary"><Save size={16}/>Save settings</button></div>
  </div>;
}
