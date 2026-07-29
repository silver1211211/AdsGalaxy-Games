"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Clock3, Coins, LoaderCircle, Pause, Play, Sparkles, Trophy, X, Zap } from "lucide-react";
import { showAdsGalaxy } from "@/lib/ads/adsgalaxy-provider";
import type { QuizSessionView } from "@/features/quiz/types";

type Feedback = { correct: boolean; timedOut: boolean; selectedOptionKey: string | null; correctOptionKey: string; correctAnswer?: string; explanation: string | null; pointsEarned: number };

export function QuizPlay() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const [session, setSession] = useState<QuizSessionView | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("");
  const restore = useCallback(async () => {
    if (!sessionId) return setMessage("No Quiz session was selected.");
    const response = await fetch(`/api/games/quiz-challenge/sessions/${sessionId}`, { cache: "no-store" });
    const body = await response.json() as { session?: QuizSessionView; error?: string };
    if (response.ok && body.session) setSession(body.session); else setMessage(body.error ?? "Quiz session unavailable");
  }, [sessionId]);
  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    if (!session?.question || session.status !== "ACTIVE" || feedback) return;
    const sync = () => setRemaining(Math.max(0, session.question!.allowedSeconds - Math.floor((Date.now() - new Date(session.question!.startedAt).getTime()) / 1000)));
    sync(); const timer = window.setInterval(sync, 250); return () => window.clearInterval(timer);
  }, [session?.question, session?.status, feedback]);
  useEffect(() => {
    if (remaining !== 0 || !session?.question || busy || feedback || session.status !== "ACTIVE") return;
    void answer(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);
  const progress = useMemo(() => session ? Math.round((session.currentPosition - 1) * 100 / session.questionCount) : 0, [session]);
  async function answer(optionKey?: string) {
    if (!session || busy || feedback) return; setBusy(true);
    const response = await fetch(`/api/games/quiz-challenge/sessions/${session.id}/answer`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionKey, version: session.version })
    });
    const body = await response.json() as { session?: QuizSessionView; feedback?: Feedback; finalQuestion?: boolean; error?: string };
    if (response.status === 409) { await restore(); setBusy(false); return; }
    if (!response.ok || !body.session || !body.feedback) { setMessage(body.error ?? "Answer could not be saved"); setBusy(false); return; }
    setSession(body.session); setFeedback(body.feedback); setBusy(false);
    window.setTimeout(async () => {
      setFeedback(null);
      if (body.finalQuestion) {
        const complete = await fetch(`/api/games/quiz-challenge/sessions/${session.id}/complete`, { method: "POST" });
        const completeBody = await complete.json() as { session?: QuizSessionView; error?: string };
        if (completeBody.session) setSession(completeBody.session); else setMessage(completeBody.error ?? "Could not complete Quiz");
      } else await restore();
    }, 2200);
  }
  async function continueBreak(watch: boolean) {
    if (!session) return; setBusy(true); setMessage("");
    if (watch) {
      const requested = await fetch(`/api/games/quiz-challenge/sessions/${session.id}/ad-break`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phase: "REQUEST" }) });
      const prepared = await requested.json() as { claimId?: string; error?: string };
      if (requested.ok && prepared.claimId) {
        const adResponse = await fetch(`/api/reward-claims/${prepared.claimId}/request-ad`, { method: "POST" });
        const ad = await adResponse.json() as { requestId?: string; adsGalaxyMiniAppId?: string; error?: string };
        if (!adResponse.ok || !ad.requestId || !ad.adsGalaxyMiniAppId) {
          setMessage(ad.error ?? "Sponsored rewards are currently unavailable.");
          setBusy(false);
          return;
        }
        const outcome = await showAdsGalaxy(ad.adsGalaxyMiniAppId);
        const report = await fetch(`/api/reward-claims/${prepared.claimId}/browser-result`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
            requestId: ad.requestId,
            outcome: outcome.status,
            ...(outcome.status === "COMPLETED" ? { providerRequestId: outcome.providerRequestId } : {}),
          })
        });
        const result = await report.json() as { message?: string }; setMessage(result.message ?? "Sponsored break updated.");
      } else setMessage(prepared.error ?? "Sponsored rewards are currently unavailable.");
    }
    const response = await fetch(`/api/games/quiz-challenge/sessions/${session.id}/continue`, { method: "POST" });
    const body = await response.json() as { session?: QuizSessionView; error?: string };
    if (body.session) setSession(body.session); else setMessage(body.error ?? "Could not continue Quiz");
    setBusy(false);
  }
  if (!session) return <Centered>{message || <><LoaderCircle className="animate-spin text-coral-500" />Restoring secure Quiz…</>}</Centered>;
  if (session.result) return <Result session={session} />;
  if (session.status === "AD_BREAK") return <Centered><Sparkles className="text-coral-500" size={36} /><p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral-500">Sponsored break</p><h1 className="text-center text-2xl font-extrabold">Great progress</h1><p className="text-center text-sm text-warm-600">Question {session.currentPosition - 1} saved · {session.score} points · {session.currentStreak}× streak</p><p className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-bold text-amber-800">Financial rewards remain pending until provider verification.</p>{message && <p className="text-center text-xs font-bold text-teal-700">{message}</p>}<button disabled={busy} onClick={() => void continueBreak(true)} className="game-primary w-full">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Play size={17} />}Watch Ad & Continue</button><button disabled={busy} onClick={() => void continueBreak(false)} className="game-secondary w-full">Continue without ad</button></Centered>;
  const question = session.question;
  if (!question) return <Centered>Preparing the next question…</Centered>;
  return <main className="mx-auto min-h-dvh max-w-[760px] px-3 pb-8 pt-3 sm:px-6 sm:pt-6">
    <header className="flex items-center justify-between"><Link href="/games/quiz-challenge" className="game-icon-button" aria-label="Exit Quiz"><ArrowLeft size={18} /></Link><div className="text-center"><p className="text-[10px] font-extrabold uppercase text-coral-500">{session.mode.replace("_", " ")}</p><p className="text-sm font-extrabold">Question {session.currentPosition} of {session.questionCount}</p></div><button className="game-icon-button" aria-label="Pause Quiz"><Pause size={18} /></button></header>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-warm-100"><div className="h-full rounded-full bg-coral-400 transition-[width]" style={{ width: `${Math.max(progress, session.currentPosition * 100 / session.questionCount)}%` }} /></div>
    <section className="mt-4 rounded-4xl bg-ink p-5 text-white shadow-float sm:p-7"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase">{question.category} · {question.difficulty}</span><span aria-live="polite" className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${remaining <= 5 ? "bg-coral-500" : "bg-white/10"}`}><Clock3 size={14} />{remaining}s</span></div><h1 className="mt-6 text-xl font-extrabold leading-8 sm:text-2xl">{question.text}</h1><div className="mt-6 flex gap-3 text-xs text-white/55"><span>{session.score} points</span><span>·</span><span>{session.currentStreak}× streak</span></div></section>
    {message && <button onClick={() => setMessage("")} className="mt-3 w-full rounded-2xl bg-coral-50 p-3 text-left text-xs font-bold text-coral-700">{message}</button>}
    <div className="mt-4 grid gap-2.5">{question.options.map((option) => {
      const correct = feedback?.correctOptionKey === option.key; const selectedWrong = feedback && feedback.selectedOptionKey === option.key && !feedback.correct;
      return <button key={option.key} disabled={busy || Boolean(feedback) || option.removed} onClick={() => void answer(option.key)}
        className={`flex min-h-14 items-center gap-3 rounded-2xl border bg-white p-3 text-left text-sm font-bold shadow-card transition ${correct ? "border-teal-500 bg-teal-50 text-teal-800" : selectedWrong ? "border-coral-500 bg-coral-50 text-coral-700" : "border-white hover:border-coral-200"} ${option.removed ? "invisible" : ""}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-warm-50">{correct ? <Check size={16} /> : selectedWrong ? <X size={16} /> : option.key}</span>{option.text}
      </button>;
    })}</div>
    <div className="mt-4 grid grid-cols-3 gap-2">{[["50/50", "Remove two", Coins], ["Extra Time", "+10 seconds", Clock3], ["Second Chance", "Retry once", Zap]].map(([title, note, Icon]) => <button key={String(title)} onClick={() => setMessage(`${title} requires a verified utility ad and is unavailable until provider verification is configured.`)} className="min-h-16 rounded-2xl bg-white p-2 text-[10px] font-bold shadow-card"><Icon className="mx-auto mb-1 text-coral-500" size={16} /><span className="block">{title as string}</span><span className="text-warm-400">{note as string}</span></button>)}</div>
    {feedback && <div aria-live="polite" className={`mt-4 rounded-3xl p-4 ${feedback.correct ? "bg-teal-50 text-teal-800" : "bg-coral-50 text-coral-800"}`}><p className="font-extrabold">{feedback.correct ? `Correct · +${feedback.pointsEarned} points` : feedback.timedOut ? "Time’s up" : `Not quite · ${feedback.correctAnswer}`}</p>{feedback.explanation && <p className="mt-1 text-xs leading-5">{feedback.explanation}</p>}</div>}
  </main>;
}
function Centered({ children }: { children: React.ReactNode }) { return <main className="grid min-h-dvh place-items-center p-5"><div className="grid w-full max-w-sm justify-items-center gap-4 rounded-4xl bg-white p-7 shadow-card">{children}</div></main>; }
function Result({ session }: { session: QuizSessionView }) { const result = session.result!; return <Centered><Trophy className="text-[#d99b21]" size={44} /><p className="text-3xl">{"⭐".repeat(result.stars)}</p><h1 className="text-2xl font-extrabold">Quiz complete!</h1><div className="grid w-full grid-cols-2 gap-2">{[["Points earned", result.points], ["Accuracy", `${(result.accuracyBps / 100).toFixed(0)}%`], ["Correct", session.correctCount], ["Best streak", `${session.bestStreak}×`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-warm-50 p-3 text-center"><p className="font-extrabold">{value}</p><p className="text-[9px] font-bold uppercase text-warm-400">{label}</p></div>)}</div><p className="text-center text-xs text-warm-500">Double Points requires a verified rewarded-ad event and can be applied only once.</p><div className="grid w-full grid-cols-2 gap-2"><Link href="/games/quiz-challenge" className="game-secondary">Quiz lobby</Link><Link href="/games" className="game-primary">Back to Games</Link></div></Centered>; }
