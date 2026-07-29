"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bot, Box, DoorOpen, KeyRound,
  MapPin, Pause, Play, RotateCcw, Snowflake, Sparkles, TriangleAlert, Zap,
} from "lucide-react";
import { showAdsGalaxy } from "@/lib/ads/adsgalaxy-provider";

type Point = { x: number; y: number };
type BoostAction =
  | "REQUEST_HINT"
  | "REQUEST_DOUBLE_POINTS"
  | "REQUEST_CONTINUE"
  | "REQUEST_FREEZE"
  | "REQUEST_BONUS_CHEST";
type View = {
  publicReference: string;
  level: number;
  status: string;
  position: Point;
  maze: {
    width: number; height: number; walls: boolean[][]; start: Point; exit: Point;
    key: (Point & { id: string }) | null;
    gate: (Point & { id: string }) | null;
    trap: Point | null;
    movingHazard: Point | null;
    chaser: Point | null;
    collectible: (Point & { id: string; kind: string }) | null;
  };
  moveCount: number;
  version: number;
  startedAt: string;
  pausedDurationMs: number;
  activeElapsedMs: number | null;
  finalPoints: number;
  rating: number | null;
  failureReason: string | null;
  livesRemaining: number;
  hazardFreezeMoves: number;
  bonusChestPoints: number;
  boostsUsed: string[];
};

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

function feedback(kind: "move" | "success" | "error" | "reward") {
  const webApp = (window as Window & {
    Telegram?: { WebApp?: { HapticFeedback?: {
      impactOccurred(style: "light" | "medium"): void;
      notificationOccurred(type: "success" | "error"): void;
    } } };
  }).Telegram?.WebApp;
  if (kind === "success" || kind === "reward" || kind === "error") {
    webApp?.HapticFeedback?.notificationOccurred(kind === "error" ? "error" : "success");
  } else {
    webApp?.HapticFeedback?.impactOccurred("light");
  }
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = kind === "error" ? 150 : kind === "move" ? 260 : 520;
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.08);
    oscillator.addEventListener("ended", () => void audio.close(), { once: true });
  } catch {
    // Audio is an enhancement; browser autoplay policies may suppress it.
  }
}

export function MazeGame() {
  const [view, setView] = useState<View | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(0);
  const touch = useRef<Point | null>(null);
  const reference = typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("attempt") || "";

  const load = useCallback(async () => {
    if (!reference) return;
    const response = await fetch(`/api/games/maze-runner/attempts/${reference}`, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setView(body.attempt);
    else setMessage(body.error ?? "Attempt unavailable");
  }, [reference]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!view || view.status !== "ACTIVE") return;
    const tick = () => setClock(Math.max(0, Date.now() - new Date(view.startedAt).getTime() - view.pausedDurationMs));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [view]);
  useEffect(() => {
    const visibility = () => {
      if (!reference || !view || !["ACTIVE", "PAUSED"].includes(view.status)) return;
      void fetch(`/api/games/maze-runner/attempts/${reference}/${document.hidden ? "pause" : "resume"}`, { method: "POST" }).then(load);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [load, reference, view]);

  async function move(direction: "UP" | "DOWN" | "LEFT" | "RIGHT") {
    if (!view || busy || view.status !== "ACTIVE") return;
    setBusy(true);
    const response = await fetch(`/api/games/maze-runner/attempts/${reference}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, version: view.version, idempotencyKey: crypto.randomUUID() }),
    });
    const body = await response.json();
    if (response.ok) {
      setView(body.attempt);
      const event = body.result.eventType?.replaceAll("_", " ");
      setMessage(event ?? "");
      feedback(body.result.completed ? "success" : body.result.failed ? "error" : event ? "reward" : "move");
    } else {
      setMessage(body.error === "GATE_LOCKED"
        ? "Find the key before opening this gate."
        : body.error === "INVALID_MOVE" ? "A wall blocks that direction." : "Move rejected; state refreshed.");
      feedback("error");
      await load();
    }
    setBusy(false);
  }

  async function rewardedBoost(action: BoostAction) {
    if (!view || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const prepared = await fetch(`/api/games/maze-runner/attempts/${reference}/boosts`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const claim = await prepared.json();
      if (!prepared.ok) throw new Error(claim.error);

      if (claim.status !== "VERIFIED" && claim.status !== "CREDITED") {
        const requested = await fetch(`/api/reward-claims/${claim.claimId}/request-ad`, { method: "POST" });
        const ad = await requested.json();
        if (!requested.ok) throw new Error(ad.error);
        const outcome = await showAdsGalaxy(ad.adsGalaxyMiniAppId);
        await fetch(`/api/reward-claims/${claim.claimId}/browser-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: ad.requestId,
            outcome: outcome.status,
            ...(outcome.status === "COMPLETED" ? { providerRequestId: outcome.providerRequestId } : {}),
          }),
        });
        if (outcome.status !== "COMPLETED") throw new Error(outcome.status.replaceAll("_", " "));
      }

      for (let i = 0; i < 6; i++) {
        if (i) await new Promise((resolve) => setTimeout(resolve, 2000));
        const consumed = await fetch(`/api/games/maze-runner/attempts/${reference}/boosts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CONSUME", claimId: claim.claimId }),
        });
        const result = await consumed.json();
        if (consumed.ok) {
          const text = result.hint
            ? `Hint: move ${result.hint}.`
            : result.bonusPoints ? `Bonus chest: +${result.bonusPoints} points!`
              : result.freezeMoves ? `Hazards frozen for ${result.freezeMoves} moves.`
                : result.continued ? "Checkpoint restored. Keep going!"
                  : "Double Points applied!";
          setMessage(text);
          feedback("reward");
          await load();
          return;
        }
      }
      setMessage("Verification is still pending. Your boost is saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Boost unavailable");
      feedback("error");
    } finally {
      setBusy(false);
    }
  }

  async function restartLevel() {
    if (!view || busy) return;
    setBusy(true);
    const response = await fetch("/api/games/maze-runner/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: view.level }),
    });
    const body = await response.json();
    if (response.ok) location.assign(`/games/maze-runner/play?attempt=${encodeURIComponent(body.attempt.publicReference)}`);
    else {
      setMessage(body.error ?? "Could not restart level");
      setBusy(false);
    }
  }

  function tapCell(x: number, y: number) {
    if (!view) return;
    const dx = x - view.position.x, dy = y - view.position.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return setMessage("Tap an adjacent path.");
    void move(dx === 1 ? "RIGHT" : dx === -1 ? "LEFT" : dy === 1 ? "DOWN" : "UP");
  }

  if (!view) return (
    <main className="grid min-h-dvh place-items-center p-4">
      <p className="rounded-3xl bg-white p-6 font-bold shadow-card">{message || "Restoring Maze Runner…"}</p>
    </main>
  );

  if (view.status === "COMPLETED" || view.status === "FAILED") return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-float">
        {view.status === "COMPLETED"
          ? <DoorOpen className="mx-auto text-teal-600" size={48} />
          : <TriangleAlert className="mx-auto text-coral-500" size={48} />}
        <h1 className="mt-3 text-3xl font-black">{view.status === "COMPLETED" ? "Level Complete" : "Level Failed"}</h1>
        <p className="mt-2 text-sm text-warm-600">
          {((view.activeElapsedMs ?? clock) / 1000).toFixed(1)}s · {view.finalPoints} points
        </p>
        {view.failureReason && <p className="mt-1 text-xs font-bold uppercase text-coral-600">{view.failureReason.replaceAll("_", " ")}</p>}
        {view.rating && <p className="mt-2 text-2xl text-amber-500">{"★".repeat(view.rating)}</p>}
        <div className="mt-5 grid gap-2">
          {view.status === "FAILED" && view.livesRemaining > 0 && !view.boostsUsed.includes("CONTINUE") && (
            <button disabled={busy} onClick={() => void rewardedBoost("REQUEST_CONTINUE")} className="game-primary justify-center">
              <Play size={16} /> Watch Ad & Continue
            </button>
          )}
          {view.status === "COMPLETED" && !view.boostsUsed.includes("DOUBLE_POINTS") && (
            <button disabled={busy} onClick={() => void rewardedBoost("REQUEST_DOUBLE_POINTS")} className="game-primary justify-center">
              <Zap size={16} /> Double Points
            </button>
          )}
          {view.status === "COMPLETED" && !view.boostsUsed.includes("BONUS_CHEST") && (
            <button disabled={busy} onClick={() => void rewardedBoost("REQUEST_BONUS_CHEST")} className="game-secondary justify-center">
              <Box size={16} /> Open Bonus Chest
            </button>
          )}
          <Link href="/games/maze-runner" className="game-secondary justify-center">Return to Levels</Link>
          <button disabled={busy} onClick={() => void restartLevel()} className="game-secondary justify-center">
            <RotateCcw size={16} /> Restart Level
          </button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-xs font-bold text-teal-700">{message}</p>
      </section>
    </main>
  );

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between rounded-2xl bg-ink p-3 text-white">
        <Link href="/games/maze-runner" aria-label="Back to levels"><ArrowLeft /></Link>
        <div className="text-center">
          <b>Level {view.level}</b>
          <small className="block text-white/60">{(clock / 1000).toFixed(1)}s · {view.moveCount} moves</small>
        </div>
        <button
          aria-label={view.status === "PAUSED" ? "Resume" : "Pause"}
          onClick={() => void fetch(`/api/games/maze-runner/attempts/${reference}/${view.status === "PAUSED" ? "resume" : "pause"}`, { method: "POST" }).then(load)}
        >
          {view.status === "PAUSED" ? <Play /> : <Pause />}
        </button>
      </header>
      {view.hazardFreezeMoves > 0 && (
        <p className="mx-auto mt-2 w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
          <Snowflake className="mr-1 inline" size={13} /> Frozen · {view.hazardFreezeMoves} moves
        </p>
      )}
      <section
        className="mt-3 touch-none rounded-3xl bg-[#15243a] p-2 shadow-float"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = { x: point.clientX, y: point.clientY };
        }}
        onTouchMove={(event) => event.preventDefault()}
        onTouchEnd={(event) => {
          if (!touch.current) return;
          const point = event.changedTouches[0];
          const dx = point.clientX - touch.current.x, dy = point.clientY - touch.current.y;
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          void move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "RIGHT" : "LEFT" : dy > 0 ? "DOWN" : "UP");
        }}
      >
        <div
          role="grid"
          aria-label={`Maze Runner level ${view.level}`}
          className="grid aspect-square w-full gap-[1px]"
          style={{ gridTemplateColumns: `repeat(${view.maze.width},minmax(0,1fr))` }}
        >
          {view.maze.walls.flatMap((row, y) => row.map((wall, x) => {
            const point = { x, y };
            const player = same(point, view.position), exit = same(point, view.maze.exit);
            const key = view.maze.key && same(point, view.maze.key), gate = view.maze.gate && same(point, view.maze.gate);
            const trap = view.maze.trap && same(point, view.maze.trap);
            const moving = view.maze.movingHazard && same(point, view.maze.movingHazard);
            const chaser = view.maze.chaser && same(point, view.maze.chaser);
            const collectible = view.maze.collectible && same(point, view.maze.collectible);
            const label = wall ? "Wall" : player ? "Player" : exit ? "Exit" : key ? "Key" : gate ? "Locked gate"
              : trap ? "Trap" : moving ? "Moving hazard" : chaser ? "Chaser" : collectible ? "Collectible" : "Path";
            return (
              <button
                key={`${x}:${y}`}
                disabled={wall || busy || view.status !== "ACTIVE"}
                onClick={() => tapCell(x, y)}
                aria-label={label}
                className={`relative grid aspect-square place-items-center rounded-[3px] ${wall ? "bg-[#07111f]" : "bg-[#e8f3ee]"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400`}
              >
                {player && <MapPin className="text-[#ef5d50]" size="65%" fill="currentColor" />}
                {exit && <DoorOpen className="text-teal-700" size="65%" />}
                {key && <KeyRound className="text-amber-600" size="58%" />}
                {gate && <span className="text-[clamp(8px,2vw,18px)]">▥</span>}
                {trap && <TriangleAlert className="text-coral-600" size="58%" />}
                {moving && <Zap className="animate-pulse text-amber-500" size="58%" />}
                {chaser && <Bot className="text-fuchsia-700" size="60%" />}
                {collectible && <Sparkles className="text-violet-600" size="55%" />}
              </button>
            );
          }))}
        </div>
      </section>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button disabled={busy || view.status !== "ACTIVE"} onClick={() => void rewardedBoost("REQUEST_HINT")} className="game-secondary">
          <Sparkles size={16} /> Get a Hint
        </button>
        {(view.maze.movingHazard || view.maze.chaser) && !view.boostsUsed.includes("FREEZE") && (
          <button disabled={busy || view.status !== "ACTIVE"} onClick={() => void rewardedBoost("REQUEST_FREEZE")} className="game-secondary">
            <Snowflake size={16} /> Freeze Hazards
          </button>
        )}
      </div>
      <p aria-live="polite" className="min-h-8 p-2 text-center text-xs font-bold text-teal-700">{message}</p>
      <nav aria-label="Directional controls" className="mx-auto grid w-40 grid-cols-3 gap-2">
        <span /><Control label="Up" onClick={() => void move("UP")}><ArrowUp /></Control><span />
        <Control label="Left" onClick={() => void move("LEFT")}><ArrowLeft /></Control>
        <Control label="Down" onClick={() => void move("DOWN")}><ArrowDown /></Control>
        <Control label="Right" onClick={() => void move("RIGHT")}><ArrowRight /></Control>
      </nav>
    </main>
  );
}

function Control({ label, onClick, children }: { label: string; onClick(): void; children: React.ReactNode }) {
  return <button aria-label={label} onClick={onClick} className="grid h-12 place-items-center rounded-2xl bg-white shadow-card active:scale-95">{children}</button>;
}
