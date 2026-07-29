"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, CalendarDays, Clock3, Layers3, LoaderCircle, Play, Target, Trophy, Volume2, WalletCards } from "lucide-react";
import { QUIZ_MODES } from "@/features/quiz/config";
import type { QuizModeKey } from "@/features/quiz/types";
import { AdSlot } from "@/components/ads/ad-slot";
import { useTelegram } from "@/components/providers/telegram-provider";

type Lobby = {
  enabled: boolean; stats: { points: number; wallet: string; highScore: number; completed: number; accuracyBps: number; bestStreak: number };
  modes: Record<QuizModeKey, boolean>; categories: Array<{ id: string; name: string; icon: string; description: string }>;
  activeSession: { id: string; mode: QuizModeKey; position: number } | null;
  daily: { started: boolean; completed: boolean; bestScore: number };
  reward: { scheduledWalletEnabled: boolean; amount: string; verification: string };
  settings: { sponsoredLobbyEnabled: boolean; soundDefault: boolean; quickCount: number; classicCount: number; categoryCount: number; dailyCount: number };
};

export function QuizLobby() {
  const { ready, authenticated } = useTelegram();
  const [data, setData] = useState<Lobby | null>(null);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState<QuizModeKey | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { if (authenticated) void fetch("/api/games/quiz-challenge/lobby", { cache: "no-store" }).then(async (r) => { if (!r.ok) throw new Error("Quiz Challenge is unavailable"); const body = await r.json() as Lobby; setData(body); setCategory(body.categories[0]?.id ?? ""); }).catch((e) => setMessage(e.message)); }, [authenticated]);
  async function start(mode: QuizModeKey) {
    setLoading(mode); setMessage("");
    const response = await fetch("/api/games/quiz-challenge/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, categoryId: mode === "CATEGORY" ? category : undefined }) });
    const body = await response.json() as { session?: { id: string }; error?: string };
    if (response.ok && body.session) window.location.href = `/games/quiz-challenge/play?session=${encodeURIComponent(body.session.id)}`;
    else { setMessage(body.error ?? "Could not start Quiz"); setLoading(null); }
  }
  if (!ready || (authenticated && !data && !message)) return <Centered><LoaderCircle className="animate-spin text-coral-500" />Loading Quiz Challenge…</Centered>;
  if (!authenticated) return <Centered><Brain className="text-coral-500" size={34} /><h1 className="text-2xl font-extrabold">Open in Telegram</h1><p className="text-center text-sm text-warm-600">A secure Telegram session is required to play.</p></Centered>;
  if (!data) return <Centered><p>{message}</p><Link href="/games" className="game-primary">Back to games</Link></Centered>;
  const counts = { QUICK: data.settings.quickCount, CLASSIC: data.settings.classicCount, CATEGORY: data.settings.categoryCount, DAILY: data.settings.dailyCount };
  return <main className="mx-auto min-h-dvh max-w-[1060px] px-4 pb-12 pt-5 sm:px-7">
    <div className="flex justify-between"><Link href="/games" className="game-icon-button" aria-label="Back to games"><ArrowLeft size={18} /></Link><button className="game-icon-button" aria-label="Toggle Quiz sound"><Volume2 size={18} /></button></div>
    <section className="relative mt-5 overflow-hidden rounded-4xl bg-ink p-6 text-white shadow-float sm:p-9"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[30px] border-coral-400/15" /><p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral-300">Think fast · Learn more</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Quiz Challenge</h1><p className="mt-3 max-w-xl text-sm text-white/60">Four server-controlled modes with timed questions, streak bonuses and optional sponsored breaks.</p>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">{[
        ["Points", data.stats.points.toLocaleString()], ["Wallet", `$${data.stats.wallet}`], ["High score", data.stats.highScore.toLocaleString()],
        ["Accuracy", `${(data.stats.accuracyBps / 100).toFixed(0)}%`], ["Best streak", data.stats.bestStreak]
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/[.07] p-3"><p className="text-[9px] font-bold uppercase text-white/45">{label}</p><p className="mt-1 truncate text-sm font-extrabold">{value}</p></div>)}</div>
    </section>
    {message && <p className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-bold text-coral-600">{message}</p>}
    {data.activeSession && <Link href={`/games/quiz-challenge/play?session=${data.activeSession.id}`} className="mt-5 flex items-center justify-between rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-800"><div><p className="text-xs font-extrabold uppercase">Active Quiz</p><p className="mt-1 text-sm font-bold">{QUIZ_MODES[data.activeSession.mode].title} · Question {data.activeSession.position}</p></div><Play size={20} /></Link>}
    <section className="mt-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral-500">Choose your challenge</p><h2 className="mt-1 text-2xl font-extrabold">Quiz modes</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{(Object.keys(QUIZ_MODES) as QuizModeKey[]).map((mode) => { const config = QUIZ_MODES[mode]; const enabled = data.modes[mode]; return <article key={mode} className="rounded-4xl bg-white p-5 shadow-card"><div className="flex justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-50 text-coral-500">{mode === "DAILY" ? <CalendarDays /> : mode === "CATEGORY" ? <Layers3 /> : mode === "CLASSIC" ? <Trophy /> : <Target />}</div><span className="rounded-full bg-warm-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-warm-500">{enabled ? "Available" : "Disabled"}</span></div><h3 className="mt-4 text-xl font-extrabold">{config.title}</h3><p className="mt-1 text-sm text-warm-600">{config.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-warm-500"><span>{counts[mode]} questions</span><span>·</span><span>{config.duration}</span><span>·</span><span>{config.adPositions.length} ad break{config.adPositions.length === 1 ? "" : "s"}</span></div>
        {mode === "CATEGORY" && <select aria-label="Quiz category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-warm-100 bg-warm-50 px-3 text-sm">{data.categories.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select>}
        <button disabled={!enabled || loading !== null} onClick={() => void start(mode)} className="game-primary mt-4 w-full">{loading === mode ? <LoaderCircle className="animate-spin" size={17} /> : <Play size={17} />}{loading === mode ? "Creating secure Quiz…" : mode === "DAILY" && data.daily.started ? "Resume Daily Challenge" : `Start ${config.title}`}</button></article>; })}</div>
    </section>
    <div className="mt-7 grid gap-4 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-4xl bg-white p-5 shadow-card"><h2 className="text-lg font-extrabold">How scoring works</h2><ul className="mt-3 grid gap-2 text-sm text-warm-600"><li>• Correct answers earn configured difficulty points.</li><li>• Time remaining and answer streaks add integer bonuses.</li><li>• Wrong or timed-out answers reset the streak.</li><li>• Financial ad rewards remain pending provider verification.</li></ul></section>{data.settings.sponsoredLobbyEnabled && <AdSlot placement="quiz_lobby_sponsored" />}</div>
  </main>;
}
function Centered({ children }: { children: React.ReactNode }) { return <main className="grid min-h-dvh place-items-center p-5"><div className="grid max-w-sm justify-items-center gap-4 rounded-4xl bg-white p-8 shadow-card">{children}</div></main>; }
