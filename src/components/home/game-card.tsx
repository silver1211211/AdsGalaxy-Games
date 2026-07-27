"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock3, Gauge, Gift } from "lucide-react";
import { GameVisual } from "./game-visual";

type Props = {
  slug: string; title: string; description: string; time: string;
  reward: string; difficulty: string; kind: "memory" | "quiz" | "tap";
};

export function GameCard(props: Props) {
  return (
    <motion.article whileHover={{ y: -5 }} whileTap={{ scale: .985 }} transition={{ duration: .18 }}
      className="group rounded-4xl border border-white bg-white p-3 shadow-card">
      <GameVisual kind={props.kind} />
      <div className="p-2.5 pb-2 pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">{props.title}</h3>
            <p className="mt-1 min-h-10 text-sm leading-5 text-warm-600">{props.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-teal-700">
            <Gift size={11} className="mr-1 inline" />{props.reward}
          </span>
        </div>
        <div className="mb-4 flex items-center gap-4 text-xs font-semibold text-warm-400">
          <span className="flex items-center gap-1.5"><Clock3 size={14} />{props.time}</span>
          <span className="flex items-center gap-1.5"><Gauge size={14} />{props.difficulty}</span>
        </div>
        <Link href={`/games/${props.slug}`} className="relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-ink px-4 text-sm font-extrabold text-white transition hover:bg-teal-700 active:scale-[.98]">
          Play now <ArrowUpRight size={17} />
        </Link>
      </div>
    </motion.article>
  );
}
