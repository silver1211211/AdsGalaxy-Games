"use client";
import { LoaderCircle, Megaphone, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTelegram } from "@/components/providers/telegram-provider";
import { useRewardedAd } from "@/hooks/use-rewarded-ad";

export function AdSlot({ placement = "games_home_sponsored" }: { placement?: "games_home_sponsored" | "quiz_lobby_sponsored" | "tap_lobby_sponsored" }) {
  const { dashboard } = useTelegram();
  const miniAppId = dashboard?.ads.configured ? dashboard.ads.miniAppId : null;
  const { show, loading } = useRewardedAd(miniAppId);
  const [message, setMessage] = useState<string | null>(null);
  if (!miniAppId) return <aside data-ad-context={placement} className="flex min-h-28 items-center rounded-3xl border border-warm-100 bg-white/70 p-5">
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-warm-100 text-warm-500"><Megaphone size={18} /></div>
      <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-warm-600">Sponsored</p><p className="mt-1 text-xs text-warm-400">No sponsored ad is available.</p></div></div>
  </aside>;
  const watch = async () => {
    setMessage(null);
    const result = await show();
    setMessage(result.status === "COMPLETED" ? "Thanks for watching."
      : result.status === "NO_FILL" ? "No sponsored ad is available right now."
      : result.status === "TIMEOUT" ? "The ad timed out. You can retry."
      : "Sponsored content is temporarily unavailable.");
  };
  return <aside data-ad-context={placement} className="relative flex min-h-40 flex-col justify-between overflow-hidden rounded-4xl bg-ink p-5 text-white shadow-float">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-teal-300">Sponsored</p><h3 className="mt-2 text-xl font-extrabold">Take a short break</h3>
      <p className="mt-1 text-xs leading-5 text-white/55">{message ?? "Ads open only after you choose to watch."}</p></div>
    <button disabled={loading} onClick={() => void watch()} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-extrabold text-ink disabled:opacity-60">
      {loading ? <LoaderCircle className="animate-spin" size={16} /> : message ? <RotateCcw size={16} /> : <Play size={16} />}
      {loading ? "Loading…" : message ? "Try again" : "Watch Ad"}
    </button>
  </aside>;
}
