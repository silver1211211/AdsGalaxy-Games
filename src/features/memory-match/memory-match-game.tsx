"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Coins, LoaderCircle, LockKeyhole, Pause, Play, RotateCcw, Shuffle, Trophy, Volume2, VolumeX, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { LEVELS, getLevel } from "./config";
import { GameHud } from "./game-hud";
import { MemoryCard } from "./memory-card";
import { playSound } from "./sound";
import type { AttemptView, ClientCard, LevelProgress, PendingClaim } from "./types";
import { showAdsGalaxy } from "@/lib/ads/adsgalaxy-provider";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/components/providers/telegram-provider";

type FlipEvent = { type: string; matched?: boolean; shuffled?: boolean; firstIndex?: number; secondIndex?: number; revealed?: Array<{ cardId: string; emoji: string; label: string; kind: ClientCard["kind"]; pairSlot: number }> };

export function MemoryMatchGame() {
  const { authenticated, ready, refreshDashboard } = useTelegram();
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState<LevelProgress[]>([]);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [rewardClaim, setRewardClaim] = useState<PendingClaim | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shuffleNotice, setShuffleNotice] = useState(false);
  const [clock, setClock] = useState(0);
  const mounted = useRef(true);

  const loadProgress = useCallback(async () => {
    const response = await fetch("/api/games/memory-match/progress", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as { highestUnlockedLevel: number; levels: LevelProgress[] };
      setProgress(data.levels);
      setLevel((current) => Math.min(current, data.highestUnlockedLevel));
    }
  }, []);
  useEffect(() => { mounted.current = true; if (authenticated) void loadProgress(); return () => { mounted.current = false; }; }, [authenticated, loadProgress]);
  useEffect(() => {
    if (!attempt || attempt.status !== "ACTIVE" || rewardClaim || pauseOpen || exitOpen) return;
    const timer = window.setInterval(() => setClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [attempt, rewardClaim, pauseOpen, exitOpen]);

  const action = useCallback(async (name: "pause" | "resume" | "restart" | "abandon") => {
    if (!attempt) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/games/memory-match/attempts/${attempt.id}/${name}`, { method: "POST" });
      if (response.ok) setAttempt((await response.json() as { attempt: AttemptView }).attempt);
    } finally { setBusy(false); }
  }, [attempt]);

  useEffect(() => {
    if (!attempt) return;
    const background = () => {
      if (document.hidden && attempt.status === "ACTIVE" && !rewardClaim) void action("pause").then(() => setPauseOpen(true));
    };
    document.addEventListener("visibilitychange", background);
    return () => document.removeEventListener("visibilitychange", background);
  }, [attempt, rewardClaim, action]);

  async function startGame(nextLevel: number) {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch("/api/games/memory-match/attempts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: nextLevel })
      });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Could not start");
      const data = await response.json() as { attempt: AttemptView };
      setAttempt(data.attempt); setClock(data.attempt.elapsedSeconds); setLevel(nextLevel);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start level"); }
    finally { setLoading(false); }
  }

  async function flip(index: number) {
    if (!attempt || busy || attempt.status !== "ACTIVE") return;
    setBusy(true); playSound("flip", muted);
    try {
      const response = await fetch(`/api/games/memory-match/attempts/${attempt.id}/flip`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, version: attempt.version })
      });
      if (response.status === 409) {
        const restored = await fetch(`/api/games/memory-match/attempts/${attempt.id}`).then((item) => item.json()) as { attempt: AttemptView };
        setAttempt(restored.attempt); return;
      }
      if (!response.ok) throw new Error("That card could not be selected");
      const data = await response.json() as { attempt: AttemptView; event: FlipEvent };
      if (data.event.revealed && data.event.firstIndex !== undefined && data.event.secondIndex !== undefined) {
        const transient = data.attempt.cards.map((card) => ({ ...card }));
        [data.event.firstIndex, data.event.secondIndex].forEach((cardIndex, eventIndex) => {
          const reveal = data.event.revealed?.[eventIndex];
          if (reveal) transient[cardIndex] = { ...transient[cardIndex], ...reveal, revealed: true };
        });
        setAttempt({ ...data.attempt, cards: transient });
        await new Promise((resolve) => window.setTimeout(resolve, data.event.matched ? 420 : 780));
      }
      if (!mounted.current) return;
      setAttempt(data.attempt);
      if (data.event.matched) playSound("match", muted); else if (data.event.type === "MISMATCH") playSound("wrong", muted);
      if (data.event.shuffled) { setShuffleNotice(true); window.setTimeout(() => setShuffleNotice(false), 1200); }
      const newestClaim = data.attempt.claims.find((claim) => claim.status === "MATCHED" && !attempt.claims.some((old) => old.id === claim.id));
      if (newestClaim) setRewardClaim(newestClaim);
      if (data.attempt.status === "COMPLETED") { playSound("victory", muted); await loadProgress(); await refreshDashboard(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Selection failed"); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function claimReward(claim: PendingClaim) {
    setBusy(true); setMessage(null);
    try {
      const requestResponse = await fetch(`/api/reward-claims/${claim.id}/request-ad`, { method: "POST" });
      if (!requestResponse.ok) throw new Error((await requestResponse.json() as { error?: string }).error ?? "Ad unavailable");
      const request = await requestResponse.json() as { requestId: string; adsGalaxyMiniAppId: string; environment: string };
      const outcome = await showAdsGalaxy(request.adsGalaxyMiniAppId);
      const report = await fetch(`/api/reward-claims/${claim.id}/browser-result`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, outcome: outcome.status, ...(outcome.status === "COMPLETED" ? { providerRequestId: outcome.providerRequestId } : {}) })
      });
      const result = await report.json() as { message?: string };
      setMessage(result.message ?? "Reward claim updated.");
      const restored = await fetch(`/api/games/memory-match/attempts/${attempt?.id}`).then((item) => item.json()) as { attempt: AttemptView };
      setAttempt(restored.attempt); setRewardClaim(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ad unavailable");
      if (attempt?.status === "PAUSED") await action("resume");
      setRewardClaim(null);
    } finally { setBusy(false); }
  }

  if (!ready) return <Centered><LoaderCircle className="animate-spin text-teal-600" size={28} /><p>Preparing Memory Match…</p></Centered>;
  if (!authenticated) return <Centered><LockKeyhole className="text-teal-600" size={30} /><h1 className="text-2xl font-extrabold">Open in Telegram</h1><p className="max-w-sm text-center text-sm text-warm-600">Secure game attempts require an authenticated Telegram Mini App session.</p><Link href="/games" className="game-primary">Back to games</Link></Centered>;
  if (!attempt) return <StartScreen level={level} setLevel={setLevel} progress={progress} loading={loading} muted={muted} setMuted={setMuted} onStart={() => void startGame(level)} message={message} />;

  const config = getLevel(attempt.level);
  const gridStyle = { gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` };
  return <main className="mx-auto min-h-dvh w-full max-w-[940px] px-3 pb-7 pt-3 sm:px-6 sm:pt-6">
    <div className="mb-3 flex items-center justify-between">
      <button onClick={() => { setPauseOpen(false); setExitOpen(true); void action("pause"); }} className="game-icon-button" aria-label="Exit game"><ArrowLeft size={19} /></button>
      <div className="flex gap-2"><button onClick={() => setMuted((v) => !v)} className="game-icon-button" aria-label={muted ? "Turn sound on" : "Turn sound off"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { setExitOpen(false); setPauseOpen(true); void action("pause"); }} className="game-icon-button" aria-label="Pause game"><Pause size={18} /></button></div>
    </div>
    <GameHud level={attempt.level} moves={attempt.moves} matched={attempt.matchedPairs} total={config.cardCount / 2} combo={attempt.currentCombo} seconds={clock} shuffles={attempt.shuffleCount} />
    {attempt.shuffleWarning && <p className="mx-auto mt-3 w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700"><Shuffle className="mr-1 inline" size={13} />{attempt.shuffleWarning}</p>}
    {message && <button onClick={() => setMessage(null)} className="mt-3 w-full rounded-2xl bg-teal-50 p-3 text-left text-xs font-bold text-teal-700">{message}</button>}
    <section className="relative mx-auto mt-3 rounded-[1.8rem] border border-white bg-white/55 p-2 shadow-card backdrop-blur sm:mt-5 sm:p-5">
      <motion.div layout className="mx-auto grid w-full max-w-[690px] gap-1.5 sm:gap-2.5" style={gridStyle}>
        {attempt.cards.map((card, index) => <MemoryCard key={card.cardId} card={card} compact={config.columns >= 5} disabled={busy || attempt.status !== "ACTIVE"} onSelect={() => void flip(index)} />)}
      </motion.div>
      <AnimatePresence>{shuffleNotice && <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center rounded-[inherit] bg-ink/65 text-xl font-extrabold text-white backdrop-blur"><Shuffle className="mr-2 inline" />Board Shuffle!</motion.div>}</AnimatePresence>
    </section>
    <PendingClaims claims={attempt.claims} onRetry={setRewardClaim} />
    <AnimatePresence>
      {rewardClaim && <RewardModal claim={rewardClaim} busy={busy} onClaim={() => void claimReward(rewardClaim)} onLater={() => { setRewardClaim(null); void action("resume"); }} />}
      {pauseOpen && <PauseModal claims={attempt.claims} busy={busy} onResume={() => { setPauseOpen(false); void action("resume"); }} onRestart={() => { setPauseOpen(false); void action("restart"); }} onExit={() => { setPauseOpen(false); setExitOpen(true); }} />}
      {exitOpen && <ExitModal busy={busy} onCancel={() => { setExitOpen(false); void action("resume"); }} onExit={() => void action("abandon")} />}
      {attempt.status === "COMPLETED" && !rewardClaim && <ResultModal attempt={attempt} onReplay={() => { setAttempt(null); void startGame(attempt.level); }} onContinue={() => { setAttempt(null); void startGame(Math.min(15, attempt.level + 1)); }} />}
    </AnimatePresence>
  </main>;
}

function Centered({ children }: { children: React.ReactNode }) { return <main className="grid min-h-dvh place-items-center p-5"><div className="grid justify-items-center gap-4 rounded-4xl bg-white p-8 shadow-card">{children}</div></main>; }
function StartScreen({ level, setLevel, progress, loading, muted, setMuted, onStart, message }: { level: number; setLevel(v: number): void; progress: LevelProgress[]; loading: boolean; muted: boolean; setMuted(v: boolean): void; onStart(): void; message: string | null }) {
  const unlocked = Math.max(1, progress.filter((item) => item.completed).reduce((max, item) => Math.max(max, item.level + 1), 1));
  return <main className="mx-auto min-h-dvh w-full max-w-[900px] px-4 pb-10 pt-5 sm:px-7 sm:pt-9">
    <div className="flex justify-between"><Link href="/games" className="game-icon-button" aria-label="Back to games"><ArrowLeft size={19} /></Link><button onClick={() => setMuted(!muted)} className="game-icon-button" aria-label={muted ? "Turn sound on" : "Turn sound off"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></div>
    <section className="mt-5 rounded-4xl bg-ink p-6 text-white shadow-float sm:p-9"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-200">Focus · Match · Master</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Memory Match</h1><p className="mt-3 text-sm text-white/60">Fifteen balanced levels, controlled board shuffles, and optional sponsored reward moments.</p></section>
    {message && <p className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-bold text-coral-600">{message}</p>}
    <section className="mt-5 rounded-4xl bg-white p-5 shadow-card sm:p-6"><div className="mb-4"><p className="text-xs font-extrabold uppercase text-teal-600">Select challenge</p><h2 className="text-xl font-extrabold">Choose a level</h2></div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">{LEVELS.map((item) => { const p = progress.find((row) => row.level === item.level); const open = item.level <= Math.min(15, unlocked); return <button key={item.level} disabled={!open || loading} onClick={() => setLevel(item.level)} className={cn("min-h-16 rounded-2xl border text-sm font-extrabold", level === item.level ? "border-teal-500 bg-teal-50 text-teal-700" : "border-warm-100 bg-warm-50", !open && "opacity-45")}>{open ? item.level : <LockKeyhole className="mx-auto" size={15} />}<span className="block text-[9px] font-semibold">{item.cardCount} cards</span>{p?.completed && <span className="block text-[8px] text-[#c78a17]">{"★".repeat(p.bestStars)}</span>}</button>; })}</div>
      <button disabled={loading} onClick={onStart} className="game-primary mt-5 w-full">{loading ? <LoaderCircle className="animate-spin" size={18} /> : <Play size={18} />} {loading ? "Creating secure attempt…" : `Start level ${level}`}</button>
    </section>
  </main>;
}
function Modal({ children }: { children: React.ReactNode }) { return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/65 p-4 backdrop-blur-md"><motion.div initial={{ y: 20, scale: .97 }} animate={{ y: 0, scale: 1 }} className="relative w-full max-w-md rounded-4xl bg-white p-6 shadow-float">{children}</motion.div></motion.div>; }
function RewardModal({ claim, busy, onClaim, onLater }: { claim: PendingClaim; busy: boolean; onClaim(): void; onLater(): void }) { const money = claim.rewardType === "MONEY"; return <Modal>{money ? <WalletCards className="mx-auto text-teal-600" size={38} /> : <Coins className="mx-auto text-[#c78a17]" size={38} />}<h2 className="mt-4 text-center text-2xl font-extrabold">{money ? "Money Match Found" : "Coin Match Found"}</h2><p className="mt-2 text-center text-sm text-warm-600">{money ? `Watch the sponsored ad to claim the configured $${claim.configuredMoneyAmount} wallet reward.` : "Watch the sponsored ad to unlock a server-issued point multiplier."}</p><p className="mt-3 rounded-2xl bg-warm-50 p-3 text-center text-[11px] text-warm-500">Production rewards remain pending until provider verification.</p><div className="mt-5 grid gap-2"><button disabled={busy} onClick={onClaim} className="game-primary">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Play size={16} />}Watch Ad & Claim</button><button disabled={busy} onClick={onLater} className="game-secondary">Continue and claim later</button></div></Modal>; }
function PendingClaims({ claims, onRetry }: { claims: PendingClaim[]; onRetry(c: PendingClaim): void }) { const pending = claims.filter((claim) => !["CREDITED", "EXPIRED", "ALREADY_CLAIMED"].includes(claim.status)); if (!pending.length) return null; return <aside className="mt-3 rounded-3xl bg-white p-3 shadow-card"><p className="text-[10px] font-extrabold uppercase text-warm-400">Saved reward claims</p><div className="mt-2 flex flex-wrap gap-2">{pending.map((claim) => <button key={claim.id} onClick={() => onRetry(claim)} className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700">{claim.rewardType === "MONEY" ? "Money reward" : "Coin multiplier"} · {claim.status.replaceAll("_", " ")}</button>)}</div></aside>; }
function PauseModal({ claims, busy, onResume, onRestart, onExit }: { claims: PendingClaim[]; busy: boolean; onResume(): void; onRestart(): void; onExit(): void }) { return <Modal><Pause className="mx-auto text-teal-600" size={34} /><h2 className="mt-4 text-center text-2xl font-extrabold">Game paused</h2><p className="mt-2 text-center text-xs text-warm-500">{claims.length} saved reward claim{claims.length === 1 ? "" : "s"}</p><div className="mt-6 grid gap-2"><button disabled={busy} onClick={onResume} className="game-primary"><Play size={17} />Resume</button><button disabled={busy} onClick={onRestart} className="game-secondary"><RotateCcw size={17} />Restart same board</button><button disabled={busy} onClick={onExit} className="game-secondary text-coral-500"><X size={17} />Exit game</button></div></Modal>; }
function ExitModal({ busy, onCancel, onExit }: { busy: boolean; onCancel(): void; onExit(): void }) { return <Modal><h2 className="text-center text-2xl font-extrabold">Leave this game?</h2><p className="mt-2 text-center text-sm text-warm-600">Your server attempt will be marked abandoned.</p><div className="mt-6 grid grid-cols-2 gap-2"><button disabled={busy} onClick={onCancel} className="game-secondary">Keep playing</button><Link onClick={onExit} href="/games" className="game-primary">Exit</Link></div></Modal>; }
function ResultModal({ attempt, onReplay, onContinue }: { attempt: AttemptView; onReplay(): void; onContinue(): void }) { return <Modal><Trophy className="mx-auto text-[#d99b21]" size={42} /><p className="mt-3 text-center text-3xl">{"⭐".repeat(attempt.stars ?? 1)}</p><h2 className="mt-2 text-center text-2xl font-extrabold">{attempt.level === 15 ? "Memory Match mastered!" : "Level complete!"}</h2><div className="mt-5 grid grid-cols-2 gap-2">{[["Score", attempt.finalPoints], ["Points earned", attempt.finalPoints], ["Best combo", `${attempt.highestCombo}×`], ["Moves", attempt.moves]].map(([label, value]) => <div key={label} className="rounded-2xl bg-warm-50 p-3 text-center"><p className="font-extrabold">{value}</p><p className="text-[9px] font-bold uppercase text-warm-400">{label}</p></div>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={onReplay} className="game-secondary"><RotateCcw size={16} />Replay</button>{attempt.level < 15 ? <button onClick={onContinue} className="game-primary"><Play size={16} />Continue</button> : <Link href="/games" className="game-primary">Back to Games</Link>}</div></Modal>; }
