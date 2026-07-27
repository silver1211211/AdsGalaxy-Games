"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { MemoryCard as Card } from "./types";
import { cn } from "@/lib/utils";

export function MemoryCard({ card, revealed, disabled, compact, onSelect }: {
  card: Card; revealed: boolean; disabled: boolean; compact: boolean; onSelect(): void;
}) {
  return (
    <motion.button type="button" onClick={onSelect} disabled={disabled || card.matched}
      whileTap={!disabled && !card.matched ? { scale: .94 } : undefined}
      aria-label={revealed ? card.label : "Hidden memory card"} aria-pressed={revealed}
      className={cn("memory-card relative aspect-[.78] min-h-0 w-full rounded-[clamp(.65rem,2vw,1.15rem)] focus-visible:z-20",
        compact ? "max-h-[112px]" : "max-h-[142px]", card.matched && "memory-card--matched")}>
      <motion.span className="memory-card__inner absolute inset-0" animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 270, damping: 24 }}>
        <span className="memory-card__face memory-card__back absolute inset-0 grid place-items-center overflow-hidden rounded-[inherit]">
          <span className="absolute -right-5 -top-5 h-14 w-14 rounded-full border-[10px] border-white/10" />
          <Sparkles className="text-white" size={compact ? 20 : 27} />
        </span>
        <span className="memory-card__face memory-card__front absolute inset-0 grid place-items-center rounded-[inherit] border border-white bg-white shadow-card">
          <span aria-hidden className={cn("select-none drop-shadow-sm", compact ? "text-[clamp(1.4rem,5vw,2.35rem)]" : "text-[clamp(2rem,6vw,3.2rem)]")}>{card.emoji}</span>
          {card.matched && <span className="absolute inset-0 rounded-[inherit] ring-2 ring-teal-500/70" />}
        </span>
      </motion.span>
    </motion.button>
  );
}
