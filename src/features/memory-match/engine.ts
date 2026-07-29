import { createHash } from "crypto";
import { getLevel, SYMBOLS } from "./config";
import type { ClientCard, RewardAssignment, ServerCard } from "./types";

function randomUnit(seed: string, offset: number) {
  const hex = createHash("sha256").update(`${seed}:${offset}`).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) / 0xffffffff;
}

export function seededShuffle<T>(items: readonly T[], seed: string, offset = 0): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(randomUnit(seed, offset + i) * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function selectRewardAssignment(level: number, seed: string, settings: {
  specialCardsEnabled: boolean; moneyMatchEnabled: boolean; coinMatchEnabled: boolean;
  coinProbabilityEarly: number; optionAWeight: number; optionBWeight: number; optionCWeight: number;
}): RewardAssignment {
  if (!settings.specialCardsEnabled) return { option: "NONE", moneyPairs: 0, coinPairs: 0 };
  if (level <= 2) {
    const eligible = settings.coinMatchEnabled && randomUnit(seed, 91) * 100 < settings.coinProbabilityEarly;
    return eligible ? { option: "EARLY_COIN", moneyPairs: 0, coinPairs: 1 } : { option: "NONE", moneyPairs: 0, coinPairs: 0 };
  }
  if (level <= 7) return settings.moneyMatchEnabled
    ? { option: "A", moneyPairs: 1, coinPairs: 0 } : { option: "NONE", moneyPairs: 0, coinPairs: 0 };
  if (level === 15) return {
    option: "FINAL", moneyPairs: settings.moneyMatchEnabled ? 1 : 0, coinPairs: settings.coinMatchEnabled ? 1 : 0
  };
  const roll = randomUnit(seed, 117) * 100;
  const a = settings.optionAWeight;
  const b = a + settings.optionBWeight;
  if (roll < a) return { option: "A", moneyPairs: settings.moneyMatchEnabled ? 1 : 0, coinPairs: 0 };
  if (roll < b) return { option: "B", moneyPairs: settings.moneyMatchEnabled ? 2 : 0, coinPairs: 0 };
  return { option: "C", moneyPairs: settings.moneyMatchEnabled ? 1 : 0, coinPairs: settings.coinMatchEnabled ? 1 : 0 };
}

export function createDeck(levelNumber: number, seed: string, assignment: RewardAssignment): ServerCard[] {
  const level = getLevel(levelNumber);
  const pairCount = level.cardCount / 2;
  const kinds = [
    ...Array.from({ length: assignment.moneyPairs }, () => "MONEY" as const),
    ...Array.from({ length: assignment.coinPairs }, () => "COIN" as const),
    ...Array.from({ length: pairCount - assignment.moneyPairs - assignment.coinPairs }, () => "REGULAR" as const)
  ];
  const symbols = seededShuffle(SYMBOLS, seed, 200);
  const pairs = kinds.map((kind, pairSlot) => {
    const symbol = kind === "MONEY" ? { id: `money-${pairSlot}`, emoji: "💵", label: "Money Match" }
      : kind === "COIN" ? { id: `coin-${pairSlot}`, emoji: "🪙", label: "Coin Match" }
      : symbols[pairSlot];
    return [
      { ...symbol, kind, pairSlot, cardId: `${symbol.id}-${pairSlot}-a`, matched: false },
      { ...symbol, kind, pairSlot, cardId: `${symbol.id}-${pairSlot}-b`, matched: false }
    ];
  }).flat();
  return seededShuffle(pairs, seed, 400);
}

export function shuffleUnmatched(cards: ServerCard[], seed: string, shuffleCount: number) {
  const unmatchedPositions = cards.map((card, index) => ({ card, index })).filter(({ card }) => !card.matched);
  const shuffled = seededShuffle(unmatchedPositions.map(({ card }) => card), seed, 800 + shuffleCount * 100);
  const output = [...cards];
  unmatchedPositions.forEach(({ index }, itemIndex) => { output[index] = shuffled[itemIndex]; });
  return output;
}

export function maskDeck(cards: ServerCard[], firstSelectedIndex: number | null): ClientCard[] {
  return cards.map((card, index) => {
    const revealed = card.matched || firstSelectedIndex === index;
    return {
      cardId: card.cardId,
      pairSlot: revealed ? card.pairSlot : null,
      kind: revealed ? card.kind : null,
      emoji: revealed ? card.emoji : null,
      label: revealed ? card.label : null,
      revealed,
      matched: card.matched
    };
  });
}
