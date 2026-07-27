import { getLevel } from "./config";
import type { CompletionInput, GameResult } from "./types";

export function pointsForMatch(level: number, combo: number, elapsedSeconds: number) {
  const speedFactor = Math.max(.65, 1.35 - elapsedSeconds / 240);
  return Math.round((90 + level * 24) * Math.max(1, combo) * speedFactor);
}

export function expectedScore(input: Omit<CompletionInput, "score">) {
  const config = getLevel(input.level);
  const idealMoves = input.matchedPairs;
  const efficiency = Math.max(.35, idealMoves / Math.max(idealMoves, input.moves));
  const speed = Math.max(.35, config.timeTarget / Math.max(config.timeTarget, input.elapsedSeconds));
  const comboBonus = 1 + Math.min(input.highestCombo, input.matchedPairs) * .045;
  return Math.round(input.matchedPairs * (110 + input.level * 26) * efficiency * speed * comboBonus);
}

export function calculateResult(input: CompletionInput): GameResult {
  const config = getLevel(input.level);
  const efficiency = input.matchedPairs / Math.max(input.matchedPairs, input.moves);
  const speedRatio = input.elapsedSeconds / config.timeTarget;
  const stars: 1 | 2 | 3 = efficiency >= .82 && speedRatio <= 1 ? 3
    : efficiency >= .58 && speedRatio <= 1.55 ? 2 : 1;
  const score = expectedScore(input);
  return {
    ...input, score, stars,
    rewardAmount: Math.round(config.baseReward * (.7 + stars * .35) * 100) / 100,
    experience: Math.round(35 + input.level * 18 + stars * 12 + input.highestCombo * 3),
    completedAt: new Date().toISOString()
  };
}
