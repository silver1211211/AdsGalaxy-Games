"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Play, Timer, Trophy } from "lucide-react";
type Lobby = { enabled: boolean; unlocked: number; levels: Array<{ level: number; label: string; fallDurationMs: number; unlocked: boolean; completed: boolean; bestTimeMs: number | null }>; stats: { completed: number; highScore: number }; active: null | { id: string; level: number; score: number } };
const time = (ms: number | null) => ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`;
export function TapLobby() {
  const [data, setData] = useState<Lobby | null>(null), [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/games/tap-collector/lobby", { cache: "no-store" }).then(async (r) => {
    if (!r.ok) throw new Error(r.status === 401 ? "Open in Telegram to play." : "Unable to load Catch Rush");
    setData(await r.json());
  }).catch((e) => setMessage(e.message)); }, []);
  async function start(level: number) {
    setMessage(`Preparing Level ${level}…`);
    const r = await fetch("/api/games/tap-collector/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level }) });
    const b = await r.json(); if (!r.ok) return setMessage(b.error ?? "Could not start");
    location.href = `/games/tap-collector/play?session=${b.id}`;
  }
  if (!data) return <main className="grid min-h-dvh place-items-center"><p className="rounded-3xl bg-white p-6 font-bold shadow-card">{message || "Loading Catch Rush…"}</p></main>;
  return <main className="mx-auto min-h-dvh max-w-3xl px-4 pb-24 pt-5">
    <Link href="/games" className="game-icon-button"><ArrowLeft size={18} /></Link>
    <section className="mt-5 overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_85%_10%,#2dd4bf55,transparent_28%),linear-gradient(145deg,#12252c,#172033)] p-6 text-white shadow-float">
      <p className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Level Journey · 10 stages</p>
      <h1 className="mt-2 text-4xl font-black">Catch Rush</h1>
      <p className="mt-2 max-w-xl text-sm text-white/70">Catch every collectible before it drops. Grab Coins, pause for Money rewards, and never tap the Bomb.</p>
      <div className="mt-5 flex gap-3 text-sm font-bold"><span className="rounded-full bg-white/10 px-3 py-2">{data.stats.completed} clears</span><span className="rounded-full bg-white/10 px-3 py-2">{data.stats.highScore} best score</span></div>
    </section>
    {data.active && <Link href={`/games/tap-collector/play?session=${data.active.id}`} className="mt-4 flex items-center justify-between rounded-3xl bg-teal-600 p-4 font-extrabold text-white"><span>Resume Level {data.active.level}</span><span>{data.active.score} pts</span></Link>}
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.levels.map((level) => <article key={level.level} className={`rounded-3xl border p-4 shadow-card ${level.unlocked ? "border-white bg-white" : "border-warm-200 bg-warm-50 text-warm-400"}`}>
        <div className="flex items-center justify-between"><span className="text-xs font-black uppercase">Level</span>{level.unlocked ? level.completed ? <Trophy size={17} className="text-amber-500" /> : <Play size={17} /> : <LockKeyhole size={17} />}</div>
        <p className="mt-1 text-3xl font-black">{level.level}</p>
        <p className="mt-2 flex items-center gap-1 text-xs"><Timer size={13} /> Best {time(level.bestTimeMs)}</p>
        <button disabled={!level.unlocked || !data.enabled} onClick={() => void start(level.level)} className="game-primary mt-3 w-full justify-center disabled:opacity-35">{level.completed ? "Replay" : "Play"}</button>
      </article>)}
    </section>
    <details className="mt-6 rounded-3xl bg-white p-5 shadow-card"><summary className="cursor-pointer font-black">How to Play Catch Rush</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-warm-600"><li>Tap every collectible before it reaches the bottom.</li><li>Collect Coins to earn points.</li><li>Money rewards may require a sponsored ad and trusted verification.</li><li>Avoid tapping Bombs; they may pass safely.</li><li>One missed required object ends the stage.</li><li>Clear the finite stage quickly to set your best time.</li><li>Higher levels fall faster.</li></ol>
    </details>
    <p aria-live="polite" className="mt-3 text-center text-xs font-bold text-coral-500">{message}</p>
  </main>;
}
