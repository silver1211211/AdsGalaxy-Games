import { createHash } from "crypto";
import type { QuizDifficultyKey } from "./types";

export type QuestionInput = {
  id: string; questionText: string; explanation: string; difficulty: QuizDifficultyKey;
  category: { name: string }; options: Array<{ id: string; optionText: string; isCorrect: boolean }>;
};

export function validateQuestion(input: { questionText: string; explanation: string; options: Array<{ text: string; correct: boolean }> }) {
  const text = input.questionText.trim();
  const options = input.options.map((option) => ({ text: option.text.trim(), correct: option.correct }));
  if (text.length < 8) throw new Error("Question text is too short");
  if (input.explanation.trim().length < 8) throw new Error("Explanation is required");
  if (options.length !== 4 || options.some((option) => !option.text)) throw new Error("Exactly four non-empty options are required");
  if (new Set(options.map((option) => option.text.toLowerCase())).size !== 4) throw new Error("Answer options must be unique");
  if (options.filter((option) => option.correct).length !== 1) throw new Error("Exactly one answer must be correct");
  return { questionText: text, explanation: input.explanation.trim(), options };
}

function unit(seed: string, index: number) {
  return Number.parseInt(createHash("sha256").update(`${seed}:${index}`).digest("hex").slice(0, 8), 16) / 0xffffffff;
}

export function deterministicShuffle<T>(values: readonly T[], seed: string) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index--) {
    const target = Math.floor(unit(seed, index) * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function selectQuestions<T extends { id: string }>(pool: T[], count: number, seed: string, recentIds: Set<string> = new Set()) {
  const preferred = pool.filter((question) => !recentIds.has(question.id));
  const fallback = pool.filter((question) => recentIds.has(question.id));
  const selected = [...deterministicShuffle(preferred, `${seed}:preferred`), ...deterministicShuffle(fallback, `${seed}:fallback`)].slice(0, count);
  if (selected.length < count) throw new Error("Not enough published questions");
  return selected;
}

export function snapshotQuestion(question: QuestionInput, position: number, allowedSeconds: number, seed: string) {
  const shuffled = deterministicShuffle(question.options, `${seed}:options:${position}`);
  const options = shuffled.map((option, index) => ({ key: String.fromCharCode(65 + index), text: option.optionText, correct: option.isCorrect }));
  return {
    questionId: question.id, position, questionText: question.questionText, explanation: question.explanation,
    categoryName: question.category.name, difficulty: question.difficulty,
    optionsSnapshot: options.map(({ key, text }) => ({ key, text })),
    correctOptionKey: options.find((option) => option.correct)!.key, allowedSeconds
  };
}

export function questionPoints(input: {
  basePoints: number; remainingMs: number; allowedMs: number; streak: number;
  maxTimeBonusBps: number; streakStepBps: number; maxStreakBonusBps: number; secondChance?: boolean;
}) {
  const timeBonusBps = Math.min(input.maxTimeBonusBps, Math.max(0, Math.round(input.remainingMs * input.maxTimeBonusBps / input.allowedMs)));
  const streakBonusBps = Math.min(input.maxStreakBonusBps, Math.max(0, (input.streak - 1) * input.streakStepBps));
  const normal = Math.round(input.basePoints * (10000 + timeBonusBps + streakBonusBps) / 10000);
  return input.secondChance ? Math.round(normal / 2) : normal;
}

export function resultStars(accuracyBps: number, averageResponseMs: number, averageAllowedMs: number): 1 | 2 | 3 {
  if (accuracyBps >= 8000 && averageResponseMs <= averageAllowedMs * 0.7) return 3;
  if (accuracyBps >= 6000) return 2;
  return 1;
}

export function adBreakEligible(input: {
  answeredPosition: number; configuredPositions: number[]; completedAds: number; maxAds: number;
  sessionSeconds: number; minimumSessionSeconds: number; lastAdSecondsAgo: number | null; minimumIntervalSeconds: number;
  lastUtilitySecondsAgo: number | null; utilityDelaySeconds: number;
}) {
  return input.configuredPositions.includes(input.answeredPosition)
    && input.completedAds < input.maxAds
    && input.sessionSeconds >= input.minimumSessionSeconds
    && (input.lastAdSecondsAgo === null || input.lastAdSecondsAgo >= input.minimumIntervalSeconds)
    && (input.lastUtilitySecondsAgo === null || input.lastUtilitySecondsAgo >= input.utilityDelaySeconds);
}
