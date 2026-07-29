import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { LEVELS } from "./config";
import { createDeck, selectRewardAssignment, shuffleUnmatched } from "./engine";
import { applyMultiplier, calculateScore, calculateStars } from "./scoring";
import { repeatPeriodKey } from "./repeat-policy";
import type { RewardAssignment } from "./types";

const settings = {
  specialCardsEnabled: true, moneyMatchEnabled: true, coinMatchEnabled: true,
  coinProbabilityEarly: 35, optionAWeight: 50, optionBWeight: 20, optionCWeight: 30
};

describe("15 level configuration", () => {
  it("contains exactly 15 balanced levels with at most 16 even cards", () => {
    expect(LEVELS).toHaveLength(15);
    LEVELS.forEach((level, index) => {
      expect(level.level).toBe(index + 1);
      expect(level.cardCount % 2).toBe(0);
      expect(level.cardCount).toBeLessThanOrEqual(16);
      expect(level.rows * level.columns).toBe(level.cardCount);
    });
    expect(LEVELS.map((level) => level.cardCount)).toEqual([6, 8, 8, 10, 10, 12, 12, 12, 14, 14, 14, 16, 16, 16, 16]);
  });
});

describe("special reward distribution", () => {
  it("never assigns Money on levels 1–2", () => {
    for (let i = 0; i < 100; i++) expect(selectRewardAssignment(i % 2 + 1, `early-${i}`, settings).moneyPairs).toBe(0);
  });
  it("assigns exactly one Money pair on levels 3–7", () => {
    for (let level = 3; level <= 7; level++) expect(selectRewardAssignment(level, `level-${level}`, settings)).toMatchObject({ moneyPairs: 1, coinPairs: 0 });
  });
  it("selects only A/B/C for levels 8–14", () => {
    for (let level = 8; level <= 14; level++) {
      const result = selectRewardAssignment(level, `weighted-${level}`, settings);
      expect(["A", "B", "C"]).toContain(result.option);
      expect(result.moneyPairs).toBeGreaterThanOrEqual(1);
      expect(result.moneyPairs + result.coinPairs).toBeLessThanOrEqual(2);
    }
  });
  it("assigns one Money and one Coin pair on level 15", () => {
    expect(selectRewardAssignment(15, "final", settings)).toEqual({ option: "FINAL", moneyPairs: 1, coinPairs: 1 });
  });
  it("is deterministic for the same seed", () => {
    expect(selectRewardAssignment(10, "same", settings)).toEqual(selectRewardAssignment(10, "same", settings));
  });
});

describe("deck and shuffle integrity", () => {
  it("gives every pair exactly two cards within the board size", () => {
    LEVELS.forEach((level) => {
      const assignment: RewardAssignment = level.level === 15 ? { option: "FINAL", moneyPairs: 1, coinPairs: 1 } : { option: "NONE", moneyPairs: 0, coinPairs: 0 };
      const deck = createDeck(level.level, `deck-${level.level}`, assignment);
      expect(deck).toHaveLength(level.cardCount);
      const counts = new Map<number, number>();
      deck.forEach((card) => counts.set(card.pairSlot, (counts.get(card.pairSlot) ?? 0) + 1));
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    });
  });
  it("moves only unmatched cards and never moves matched cards", () => {
    const deck = createDeck(15, "shuffle", { option: "FINAL", moneyPairs: 1, coinPairs: 1 });
    deck[0] = { ...deck[0], matched: true }; deck[1] = { ...deck[1], matched: true };
    const shuffled = shuffleUnmatched(deck, "shuffle", 1);
    expect(shuffled[0]).toEqual(deck[0]); expect(shuffled[1]).toEqual(deck[1]);
    expect(shuffled.filter((card) => !card.matched).map((card) => card.cardId).sort()).toEqual(deck.filter((card) => !card.matched).map((card) => card.cardId).sort());
  });
});

describe("scoring and safe numeric rules", () => {
  it("calculates stable score and star thresholds", () => {
    const input = { level: 8, moves: 6, mismatches: 0, elapsedSeconds: 40, highestCombo: 6, shuffleCount: 1 };
    expect(calculateScore(input)).toBeGreaterThan(0);
    expect(calculateStars(input)).toBe(3);
  });
  it("applies integer thousandths with round-to-nearest", () => {
    expect(applyMultiplier(40, 1400)).toBe(56);
    expect(() => applyMultiplier(40, 1250)).toThrow();
  });
  it("represents the configurable default exactly as Decimal", () => {
    expect(new Prisma.Decimal("0.05").times(2).toFixed(2)).toBe("0.10");
  });
  it("creates stable repeat-policy entitlement periods", () => {
    const now = new Date("2026-07-27T12:00:00Z");
    expect(repeatPeriodKey("ONCE_EVER", now)).toBe("EVER");
    expect(repeatPeriodKey("DAILY", now)).toBe("2026-07-27");
    expect(repeatPeriodKey("WEEKLY", now)).toBe("2026-07-27");
  });
});
