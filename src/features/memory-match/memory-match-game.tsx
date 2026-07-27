"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BarChart3, CalendarDays, LockKeyhole, Pause, Play, RotateCcw, Settings2, Trophy, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { LEVELS, DAILY_CHALLENGE, getLevel } from "./config";
import { createDeck } from "./engine";
import { GameHud } from "./game-hud";
import { MemoryCard } from "./memory-card";
import { pointsForMatch } from "./scoring";
import { ACHIEVEMENT_LABELS, DEFAULT_STATS, loadStats, recordResult } from "./progress";
import { playSound } from "./sound";
import type { GameResult, MemoryCard as Card, MemoryStats } from "./types";
import { cn } from "@/lib/utils";

type Feedback = { id: number; text: string; good: boolean };

export function MemoryMatchGame() {
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState<Card[]>([]);
  const [opened, setOpened] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highestCombo, setHighestCombo] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<MemoryStats>(DEFAULT_STATS);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [confirmExit, setConfirmExit] = useState(false);
  const feedbackId = useRef(0);
  const config = getLevel(level);
  const totalPairs = (config.rows * config.columns) / 2;

  useEffect(() => setStats(loadStats()), []);
  useEffect(() => {
    if (!started || paused || result) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, paused, result]);

  const startGame = useCallback((nextLevel = level) => {
    setLevel(nextLevel); setDeck(createDeck(nextLevel)); setOpened([]); setMoves(0); setMatched(0);
    setScore(0); setCombo(0); setHighestCombo(0); setSeconds(0); setResult(null);
    setNewAchievements([]); setLocked(false); setPaused(false); setStarted(true); setConfirmExit(false);
  }, [level]);

  const finishGame = useCallback(async (finalMoves: number, finalMatched: number, finalCombo: number, displayScore: number) => {
    setLocked(true);
    const payload = { level, moves: finalMoves, elapsedSeconds: Math.max(1, seconds), highestCombo: finalCombo, matchedPairs: finalMatched, score: displayScore };
    try {
      const response = await fetch("/api/games/memory-match/complete", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Completion validation failed");
      const { result: validated } = await response.json() as { result: GameResult };
      setResult(validated); setScore(validated.score); playSound("victory", muted);
      const progress = recordResult(validated);
      setStats(progress.stats); setNewAchievements(progress.newlyUnlocked);
      localStorage.setItem("ads-galaxy:memory-match:last-result", JSON.stringify(validated));
      window.dispatchEvent(new CustomEvent("ads-galaxy:game-complete", { detail: validated }));
    } catch {
      setFeedback({ id: ++feedbackId.current, text: "Could not validate this run", good: false });
      setLocked(false);
    }
  }, [level, seconds, muted]);

  const selectCard = (index: number) => {
    if (!started || paused || locked || opened.includes(index) || deck[index]?.matched) return;
    playSound("flip", muted);
    if (opened.length === 0) { setOpened([index]); return; }
    const firstIndex = opened[0];
    const first = deck[firstIndex];
    const second = deck[index];
    if (!first || !second) return;
    const nextMoves = moves + 1;
    setMoves(nextMoves); setOpened([firstIndex, index]); setLocked(true);
    if (first.id === second.id) {
      const nextCombo = combo + 1;
      const gained = pointsForMatch(level, nextCombo, seconds);
      const nextScore = score + gained;
      const nextMatched = matched + 1;
      window.setTimeout(() => {
        setDeck((cards) => cards.map((card, cardIndex) =>
          cardIndex === firstIndex || cardIndex === index ? { ...card, matched: true } : card
        ));
        setMatched(nextMatched); setCombo(nextCombo); setHighestCombo((value) => Math.max(value, nextCombo));
        setScore(nextScore); setOpened([]); playSound("match", muted);
        setFeedback({ id: ++feedbackId.current, text: `+${gained}${nextCombo > 1 ? ` · ${nextCombo}× combo` : ""}`, good: true });
        if (nextMatched === totalPairs) void finishGame(nextMoves, nextMatched, Math.max(highestCombo, nextCombo), nextScore);
        else setLocked(false);
      }, 420);
    } else {
      window.setTimeout(() => {
        setOpened([]); setCombo(0); setLocked(false); playSound("wrong", muted);
        setFeedback({ id: ++feedbackId.current, text: "Combo reset", good: false });
      }, 780);
    }
  };

  const gridStyle = useMemo(() => ({ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }), [config.columns]);
  const compact = config.columns >= 5 || config.rows >= 5;

  if (!started) return <StartScreen level={level} setLevel={setLevel} stats={stats} onStart={() => startGame(level)} muted={muted} setMuted={setMuted} />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[940px] px-3 pb-7 pt-3 sm:px-6 sm:pt-6">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setConfirmExit(true)} className="game-icon-button" aria-label="Exit game"><ArrowLeft size={19} /></button>
        <div className="flex gap-2">
          <button onClick={() => setMuted((value) => !value)} className="game-icon-button" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button onClick={() => setPaused(true)} className="game-icon-button" aria-label="Pause game"><Pause size={18} /></button>
        </div>
      </div>
      <GameHud level={level} moves={moves} matched={matched} total={totalPairs} score={score} combo={combo} seconds={seconds} />
      <section className="relative mx-auto mt-3 rounded-[1.8rem] border border-white bg-white/55 p-2.5 shadow-card backdrop-blur sm:mt-5 sm:p-5">
        <div className={cn("mx-auto grid w-full gap-1.5 sm:gap-2.5", compact ? "max-w-[610px]" : "max-w-[690px]")} style={gridStyle}>
          {deck.map((card, index) => <MemoryCard key={card.cardId} card={card} compact={compact}
            revealed={opened.includes(index) || card.matched} disabled={locked && !opened.includes(index)} onSelect={() => selectCard(index)} />)}
        </div>
        <AnimatePresence>{feedback && <motion.div key={feedback.id} initial={{ opacity: 0, y: 12, scale: .9 }} animate={{ opacity: 1, y: -8, scale: 1 }} exit={{ opacity: 0, y: -30 }}
          transition={{ duration: .35 }} onAnimationComplete={() => window.setTimeout(() => setFeedback(null), 500)}
          className={cn("pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-extrabold text-white shadow-float", feedback.good ? "bg-teal-600" : "bg-coral-500")}>{feedback.text}</motion.div>}</AnimatePresence>
      </section>
      <p className="mt-3 text-center text-[10px] font-semibold text-warm-400">Choose two cards · Match pairs · Build your combo</p>
      <AnimatePresence>
        {paused && <PauseModal onResume={() => setPaused(false)} onRestart={() => startGame(level)} onExit={() => setConfirmExit(true)} />}
        {confirmExit && <ConfirmExit onCancel={() => setConfirmExit(false)} />}
        {result && <VictoryModal result={result} achievements={newAchievements} canContinue={level < LEVELS.length}
          onReplay={() => startGame(level)} onContinue={() => startGame(Math.min(LEVELS.length, level + 1))} />}
      </AnimatePresence>
    </main>
  );
}

function StartScreen({ level, setLevel, stats, onStart, muted, setMuted }: {
  level: number; setLevel(value: number): void; stats: MemoryStats; onStart(): void; muted: boolean; setMuted(value: boolean): void;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[900px] px-4 pb-10 pt-5 sm:px-7 sm:pt-9">
      <div className="flex items-center justify-between"><Link href="/games" className="game-icon-button" aria-label="Back to games"><ArrowLeft size={19} /></Link><button onClick={() => setMuted(!muted)} className="game-icon-button">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></div>
      <section className="mt-5 overflow-hidden rounded-4xl bg-ink p-6 text-white shadow-float sm:p-9">
        <div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-teal-500 text-3xl">🧠</div><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-100">Focus · Match · Win</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Memory Match</h1></div></div>
        <p className="mt-5 max-w-xl text-sm leading-6 text-white/65">Train your memory, chain perfect matches, and master increasingly challenging boards.</p>
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-4xl bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-teal-600">Select challenge</p><h2 className="mt-1 text-xl font-extrabold">Choose a level</h2></div><Settings2 className="text-warm-400" size={20} /></div>
          <div className="grid grid-cols-5 gap-2">{LEVELS.map((item) => {
            const unlocked = item.level <= stats.highestUnlockedLevel;
            return <button key={item.level} disabled={!unlocked} onClick={() => setLevel(item.level)}
              className={cn("relative min-h-16 rounded-2xl border text-sm font-extrabold transition active:scale-95",
                level === item.level ? "border-teal-500 bg-teal-50 text-teal-700" : "border-warm-100 bg-warm-50 text-warm-600",
                !unlocked && "opacity-45")}>{unlocked ? item.level : <LockKeyhole className="mx-auto" size={16} />}<span className="block text-[9px] font-semibold">{item.rows}×{item.columns}</span></button>;
          })}</div>
          <button onClick={onStart} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 text-sm font-extrabold text-white shadow-float transition hover:bg-teal-700 active:scale-[.98]"><Play size={18} fill="currentColor" />Start level {level}</button>
        </section>
        <div className="grid gap-4">
          <section className="rounded-3xl border border-coral-400/15 bg-coral-50 p-5"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-coral-500"><CalendarDays size={15} />Daily challenge</p><h3 className="mt-2 font-extrabold">{DAILY_CHALLENGE.title}</h3><p className="mt-1 text-xs leading-5 text-warm-600">{DAILY_CHALLENGE.description}</p></section>
          <section className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-4 shadow-card">
            {[["Wins", stats.gamesWon], ["Best", stats.highestScore.toLocaleString()], ["Combo", `${stats.bestCombo}×`]].map(([label, value]) => <div key={label} className="text-center"><p className="text-sm font-extrabold">{value}</p><p className="text-[9px] font-bold uppercase text-warm-400">{label}</p></div>)}
          </section>
        </div>
      </div>
    </main>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/65 p-4 backdrop-blur-md"><motion.div initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-md rounded-4xl bg-white p-6 shadow-float">{children}</motion.div></motion.div>;
}
function PauseModal({ onResume, onRestart, onExit }: { onResume(): void; onRestart(): void; onExit(): void }) {
  return <Modal><Pause className="mx-auto text-teal-600" size={34} /><h2 className="mt-4 text-center text-2xl font-extrabold">Game paused</h2><div className="mt-6 grid gap-2"><button onClick={onResume} className="game-primary"><Play size={17} />Resume</button><button onClick={onRestart} className="game-secondary"><RotateCcw size={17} />Restart</button><button onClick={onExit} className="game-secondary text-coral-500"><X size={17} />Exit game</button></div></Modal>;
}
function ConfirmExit({ onCancel }: { onCancel(): void }) {
  return <Modal><h2 className="text-center text-2xl font-extrabold">Leave this game?</h2><p className="mt-2 text-center text-sm text-warm-600">This run won&apos;t be saved.</p><div className="mt-6 grid grid-cols-2 gap-2"><button onClick={onCancel} className="game-secondary">Keep playing</button><Link href="/games" className="game-primary">Exit</Link></div></Modal>;
}
function VictoryModal({ result, achievements, canContinue, onReplay, onContinue }: { result: GameResult; achievements: string[]; canContinue: boolean; onReplay(): void; onContinue(): void }) {
  return <Modal><div className="memory-confetti" aria-hidden>{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div><Trophy className="mx-auto text-[#d99b21]" size={42} /><p className="mt-3 text-center text-3xl tracking-[.15em]">{Array.from({ length: 3 }, (_, i) => <span key={i} className={i < result.stars ? "" : "grayscale opacity-20"}>⭐</span>)}</p><h2 className="mt-2 text-center text-2xl font-extrabold">{result.stars === 3 ? "Perfect!" : result.stars === 2 ? "Great run!" : "Level complete!"}</h2>
    <div className="mt-5 grid grid-cols-3 gap-2">{[["Score", result.score.toLocaleString()], ["XP", `+${result.experience}`], ["Reward", `+${result.rewardAmount}`], ["Time", `${result.elapsedSeconds}s`], ["Moves", result.moves], ["Best combo", `${result.highestCombo}×`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-warm-50 p-2.5 text-center"><p className="text-sm font-extrabold">{value}</p><p className="text-[9px] font-bold uppercase text-warm-400">{label}</p></div>)}</div>
    {achievements.length > 0 && <div className="mt-4 rounded-2xl bg-teal-50 p-3 text-center text-xs font-bold text-teal-700"><Trophy className="mr-1 inline" size={14} />Achievement unlocked: {achievements.map((id) => ACHIEVEMENT_LABELS[id]).join(", ")}</div>}
    <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={onReplay} className="game-secondary"><RotateCcw size={16} />Replay</button>{canContinue ? <button onClick={onContinue} className="game-primary"><Play size={16} />Continue</button> : <Link href="/games" className="game-primary">Finish</Link>}</div></Modal>;
}
