"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock3, Coins, Gauge, LockKeyhole, WalletCards } from "lucide-react";
import { GameVisual } from "./game-visual";
import { useTelegram } from "@/components/providers/telegram-provider";

type Props = {
  slug: string; title: string; description: string; time: string;
  difficulty: string; kind: "memory" | "quiz" | "tap" | "maze"; available: boolean;
};

export function GameCard(props: Props) {
  const { dashboard } = useTelegram();
  return <motion.article whileHover={props.available ? { y: -5 } : undefined} whileTap={props.available ? { scale: .985 } : undefined}
    className="group rounded-4xl border border-white bg-white p-3 shadow-card">
    <GameVisual kind={props.kind} />
    <div className="p-2.5 pb-2 pt-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-extrabold">{props.title}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-warm-600">{props.description}</p></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${props.available ? "bg-teal-50 text-teal-700" : "bg-warm-100 text-warm-500"}`}>
          {props.available ? "Play" : "Coming soon"}
        </span>
      </div>
      {props.available && <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
        {props.kind === "memory" ? <><span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">{dashboard?.unlockedLevels ?? 1}/15 levels</span><span className="flex items-center gap-1 rounded-full bg-[#fff8df] px-2 py-1 text-[#a66c08]"><WalletCards size={11} />Money Match</span><span className="flex items-center gap-1 rounded-full bg-coral-50 px-2 py-1 text-coral-500"><Coins size={11} />Coin Match</span></>
          : props.kind === "maze" ? <><span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">20 levels</span><span className="rounded-full bg-[#fff8df] px-2 py-1 text-[#a66c08]">Keys & gates</span><span className="rounded-full bg-coral-50 px-2 py-1 text-coral-600">Optional boosts</span></>
          : <><span className="rounded-full bg-coral-50 px-2 py-1 text-coral-600">4 modes</span><span className="rounded-full bg-[#fff8df] px-2 py-1 text-[#a66c08]">10 categories</span><span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Daily challenge</span></>}
      </div>}
      <div className="mb-4 flex items-center gap-4 text-xs font-semibold text-warm-400"><span className="flex items-center gap-1.5"><Clock3 size={14} />{props.time}</span><span className="flex items-center gap-1.5"><Gauge size={14} />{props.difficulty}</span></div>
      {props.available ? <Link href={`/games/${props.slug}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-extrabold text-white hover:bg-teal-700">Play now <ArrowUpRight size={17} /></Link>
        : <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-warm-100 px-4 text-sm font-extrabold text-warm-400"><LockKeyhole size={16} />In development</div>}
    </div>
  </motion.article>;
}
