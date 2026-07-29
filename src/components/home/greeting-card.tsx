"use client";

import { Coins, Layers3, LoaderCircle, WalletCards } from "lucide-react";
import { useTelegram } from "@/components/providers/telegram-provider";

export function GreetingCard() {
  const { user, ready, authenticated, dashboard } = useTelegram();
  const initial = user.firstName.slice(0, 1).toUpperCase();
  return (
    <section className="relative overflow-hidden rounded-4xl bg-ink p-5 text-white shadow-float sm:p-7">
      <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-teal-500/15" />
      <div className="relative">
        <div className="flex items-center gap-3">
          {user.avatar ? <img src={user.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/15" /> :
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500 text-lg font-extrabold">{initial}</div>}
          <div><p className="text-xs font-semibold text-white/55">WELCOME BACK</p><h1 className="text-xl font-extrabold sm:text-2xl">Hello, {user.firstName}</h1></div>
        </div>
        {!ready ? <div className="mt-7 flex items-center gap-2 text-sm text-white/60"><LoaderCircle className="animate-spin" size={16} />Loading your progress…</div>
          : !authenticated ? <p className="mt-7 rounded-2xl bg-white/[.07] p-4 text-sm text-white/70">Open this Mini App inside Telegram to load your secure progress.</p>
          : <div className="mt-7 grid grid-cols-3 gap-2.5">
            {[
              { icon: Layers3, label: "Unlocked", value: `${dashboard?.unlockedLevels ?? 1}/15` },
              { icon: Coins, label: "Points", value: (dashboard?.points ?? 0).toLocaleString() },
              { icon: WalletCards, label: "Balance", value: `$${dashboard?.wallet.available ?? "0.00"}` }
            ].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-white/55"><Icon size={13} className="text-teal-500" />{label}</div>
              <p className="truncate text-sm font-extrabold">{value}</p>
            </div>)}
          </div>}
      </div>
    </section>
  );
}
