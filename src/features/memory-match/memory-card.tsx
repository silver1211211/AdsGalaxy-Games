"use client";
import { motion } from "framer-motion";
import { Coins, Sparkles, WalletCards } from "lucide-react";
import type { ClientCard } from "./types";
import { cn } from "@/lib/utils";

export function MemoryCard({ card, disabled, compact, onSelect }: { card: ClientCard; disabled: boolean; compact: boolean; onSelect(): void }) {
  const Special = card.kind === "MONEY" ? WalletCards : card.kind === "COIN" ? Coins : null;
  return <motion.button layout type="button" onClick={onSelect} disabled={disabled || card.matched}
    whileTap={!disabled && !card.matched ? { scale: .94 } : undefined}
    aria-label={card.revealed ? card.label ?? "Revealed card" : "Hidden memory card"} aria-pressed={card.revealed}
    className={cn("memory-card relative aspect-[.78] min-h-0 w-full rounded-[clamp(.65rem,2vw,1.15rem)] focus-visible:z-20",
      compact ? "max-h-[112px]" : "max-h-[142px]", card.matched && "memory-card--matched")}>
    <motion.span className="memory-card__inner absolute inset-0" animate={{ rotateY: card.revealed ? 180 : 0 }} transition={{ type: "spring", stiffness: 270, damping: 24 }}>
      <span className="memory-card__face memory-card__back absolute inset-0 grid place-items-center overflow-hidden rounded-[inherit]"><Sparkles className="text-white" size={compact ? 20 : 27} /></span>
      <span className={cn("memory-card__face memory-card__front absolute inset-0 grid place-items-center rounded-[inherit] border bg-white shadow-card",
        card.kind === "MONEY" && "border-teal-300 bg-teal-50", card.kind === "COIN" && "border-amber-300 bg-amber-50")}>
        <span aria-hidden className={cn("select-none drop-shadow-sm", compact ? "text-[clamp(1.35rem,5vw,2.2rem)]" : "text-[clamp(1.8rem,6vw,3rem)]")}>{card.emoji}</span>
        {Special && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white p-1 shadow"><Special size={10} /></span>}
        {card.matched && <span className="absolute inset-0 rounded-[inherit] ring-2 ring-teal-500/70" />}
      </span>
    </motion.span>
  </motion.button>;
}
