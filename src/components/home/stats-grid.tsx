"use client";
import { Coins, Gamepad2, Trophy, WalletCards } from "lucide-react";
import { useTelegram } from "@/components/providers/telegram-provider";

export function StatsGrid() {
  const { authenticated, dashboard } = useTelegram();
  if (!authenticated) return <div className="rounded-3xl bg-white p-5 text-sm text-warm-600 shadow-card">Your authenticated game statistics will appear here.</div>;
  const stats = [
    { label: "Games completed", value: dashboard?.completedGames ?? 0, hint: "verified sessions", icon: Gamepad2, color: "bg-teal-50 text-teal-600" },
    { label: "Total points", value: dashboard?.points ?? 0, hint: "tenant-scoped", icon: Coins, color: "bg-coral-50 text-coral-500" },
    { label: "Available balance", value: `$${dashboard?.wallet.available ?? "0.00"}`, hint: `$${dashboard?.wallet.pending ?? "0.00"} pending`, icon: WalletCards, color: "bg-[#f3f0ff] text-[#765ac9]" },
    { label: "Memory high score", value: dashboard?.highScore ?? 0, hint: `${dashboard?.bestStars ?? 0} best stars`, icon: Trophy, color: "bg-[#fff8df] text-[#c78a17]" }
  ];
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, hint, icon: Icon, color }) =>
    <article key={label} className="rounded-3xl border border-white bg-white p-4 shadow-card sm:p-5">
      <div className={`mb-5 grid h-10 w-10 place-items-center rounded-2xl ${color}`}><Icon size={19} /></div>
      <p className="truncate text-xl font-extrabold sm:text-2xl">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-xs font-bold text-warm-600">{label}</p><p className="mt-0.5 text-[10px] text-warm-400">{hint}</p>
    </article>)}</div>;
}
