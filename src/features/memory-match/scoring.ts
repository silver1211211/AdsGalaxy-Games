import { getLevel } from "./config";

export type ScoreInput = {
  level: number;
  moves: number;
  mismatches: number;
  elapsedSeconds: number;
  highestCombo: number;
  shuffleCount: number;
};

export function calculateScore(input: ScoreInput) {
  const level = getLevel(input.level);
  const pairs = level.cardCount / 2;
  const efficiencyPermille = Math.max(350, Math.round((pairs * 1000) / Math.max(pairs, input.moves)));
  const speedPermille = Math.max(400, Math.round((level.timeTarget * 1000) / Math.max(level.timeTarget, input.elapsedSeconds)));
  const comboBonus = Math.min(300, input.highestCombo * 30);
  const shuffleBonus = input.shuffleCount * 40;
  return Math.round((level.basePoints * (efficiencyPermille + speedPermille + comboBonus + shuffleBonus)) / 2000);
}
export function calculateStars(input: ScoreInput): 1 | 2 | 3 {
  const level = getLevel(input.level);
  const pairs = level.cardCount / 2;
  const efficiency = pairs / Math.max(pairs, input.moves);
  if (input.elapsedSeconds <= level.timeTarget && efficiency >= 0.8) return 3;
  if (input.elapsedSeconds <= level.goodTimeTarget && efficiency >= 0.58) return 2;
  return 1;
}

/** Multiplier is stored in thousandths. Final points use round-to-nearest integer. */
export function applyMultiplier(basePoints: number, multiplier: number) {
  if (![1200, 1300, 1400, 1500].includes(multiplier)) throw new Error("Invalid multiplier");
  return Math.round((basePoints * multiplier) / 1000);
}
