"use client";

import { Bell, Flame, Sparkles, Star, WalletCards } from "lucide-react";
import { useTelegram } from "@/components/providers/telegram-provider";

export function GreetingCard() {
  const { user } = useTelegram();
  const initial = user.firstName.slice(0, 1).toUpperCase();
  return (
    <section className="relative overflow-hidden rounded-4xl bg-ink p-5 text-white shadow-float sm:p-7">
      <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-teal-500/15" />
      <div aria-hidden className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-coral-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/15" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500 text-lg font-extrabold shadow-lg">{initial}</div>
            )}
            <div>
              <p className="text-xs font-semibold text-white/55">WELCOME BACK</p>
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Hello, {user.firstName}</h1>
            </div>
          </div>
          <button aria-label="Notifications" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 transition hover:bg-white/15 active:scale-95">
            <Bell size={19} /><span className="absolute ml-3 -mt-3 h-2 w-2 rounded-full bg-coral-400 ring-2 ring-ink" />
          </button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { icon: Sparkles, label: "Level", value: "Explorer" },
            { icon: Star, label: "Points", value: "2,480" },
            { icon: WalletCards, label: "Balance", value: "$12.40" },
            { icon: Flame, label: "Streak", value: "7 days" }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-3.5 backdrop-blur">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/55"><Icon size={13} className="text-teal-500" />{label}</div>
              <p className="text-sm font-extrabold">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
