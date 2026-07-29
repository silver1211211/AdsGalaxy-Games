import { createHash } from "crypto";
import type { TapItemClass, TapItemType } from "@prisma/client";
import { CATCH_RUSH_DISTRIBUTION, CATCH_RUSH_ITEMS, levelConfig } from "./config";

const hash = (seed: string, index: number, salt: string) =>
  Number.parseInt(createHash("sha256").update(`${seed}:${index}:${salt}`).digest("hex").slice(0, 8), 16);
export function validateDistribution(input: Record<string, number>) {
  const values = Object.values(input);
  return values.every((value) => Number.isFinite(value) && value >= 0) && values.reduce((sum, value) => sum + value, 0) === 100;
}
export type CatchRushSpawn = {
  sequence: number; itemType: TapItemType; itemClass: TapItemClass; itemKey: string;
  required: boolean; normalizedX: number; normalizedY: number; lane: number; speedTier: number;
  baseValue: number; spawnedAtOffsetMs: number; expiresAtOffsetMs: number; fallDurationMs: number; movementType: "DRIFT_DOWN";
};
export const CATCH_RUSH_FIRST_SPAWN_DELAY_MS = 900;
export const CATCH_RUSH_EARLY_TOLERANCE_MS = 250;
export const CATCH_RUSH_LATE_TOLERANCE_MS = 850;
export const CATCH_RUSH_MISS_TOLERANCE_MS = 1_500;
export const freshCatchRushState = () => ({
  status: "READY" as const,
  score: 0,
  combo: 0,
  basePoints: 0,
  finalPoints: 0,
  startedAt: null,
  waveStartedAt: null,
  waveEndsAt: null,
});
export function catchRushSessionHealth(input: {
  status: string; startedAt: Date | null; waveStartedAt: Date | null;
  score: number; combo: number; eventCount: number; expiresAt: Date; now?: Date;
}) {
  const now = input.now ?? new Date();
  if (input.expiresAt <= now && !["COMPLETED","GAME_OVER","ABANDONED","EXPIRED"].includes(input.status)) return "EXPIRED";
  if (input.eventCount === 0) return "CORRUPTED";
  if (input.status === "READY" && (input.startedAt || input.waveStartedAt || input.score !== 0 || input.combo !== 0)) return "CORRUPTED";
  if (["ACTIVE","PAUSED","AD_BREAK"].includes(input.status) && (!input.startedAt || !input.waveStartedAt)) return "CORRUPTED";
  return "VALID";
}
export function generateStage(seed: string, level: number, coinPoints: number): CatchRushSpawn[] {
  if (!validateDistribution(CATCH_RUSH_DISTRIBUTION)) throw new Error("Catch Rush distribution must total 100%");
  const config = levelConfig(level);
  let moneyCount = 0, previousLane = -1;
  const laneCount = config.simultaneousCap === 1 ? 4 : 5;
  return Array.from({ length: config.eventCount }, (_, index) => {
    let roll = hash(seed, index, "class") % 100;
    if (roll >= 35 && roll < 50 && moneyCount >= config.moneyCap) roll = 55 + (roll % 45);
    let itemType: TapItemType, itemClass: TapItemClass, itemKey: string, baseValue = 10;
    if (roll < 35) { itemType = "COIN"; itemClass = "COIN_REWARD"; itemKey = "coin"; baseValue = coinPoints; }
    else if (roll < 50) { itemType = "MONEY"; itemClass = "MONEY_REWARD"; itemKey = "money"; baseValue = 0; moneyCount++; }
    else if (roll < 55) { itemType = "BOMB"; itemClass = "HAZARD"; itemKey = "bomb"; baseValue = 0; }
    else { const standard = CATCH_RUSH_ITEMS[hash(seed, index, "item") % CATCH_RUSH_ITEMS.length]; itemType = standard.itemType; itemClass = "STANDARD"; itemKey = standard.key; }
    let lane = hash(seed, index, "lane") % laneCount;
    if (lane === previousLane) lane = (lane + 2) % laneCount;
    previousLane = lane;
    const spawn = CATCH_RUSH_FIRST_SPAWN_DELAY_MS + index * config.spawnIntervalMs;
    return { sequence: index + 1, itemType, itemClass, itemKey, required: itemClass !== "HAZARD",
      normalizedX: Math.round(((lane + .5) / laneCount) * 10000), normalizedY: -800, lane,
      speedTier: level, baseValue, spawnedAtOffsetMs: spawn, expiresAtOffsetMs: spawn + config.fallDurationMs,
      fallDurationMs: config.fallDurationMs, movementType: "DRIFT_DOWN" };
  });
}
export const activeElapsed = (startedAt: Date, now: Date, pausedMs: number) => Math.max(0, now.getTime() - startedAt.getTime() - pausedMs);
export function performanceRating(level: number, elapsedMs: number) {
  const c = levelConfig(level), target = (c.eventCount - 1) * c.spawnIntervalMs + c.fallDurationMs;
  return elapsedMs <= target * .86 ? 3 : elapsedMs <= target * .96 ? 2 : 1;
}
export function validateStagePlan(plan: CatchRushSpawn[]) {
  if (!plan.length) return false;
  const ids = new Set<number>();
  return plan.every((event, index) => {
    if (ids.has(event.sequence)) return false;
    ids.add(event.sequence);
    return event.sequence === index + 1
      && event.spawnedAtOffsetMs >= CATCH_RUSH_FIRST_SPAWN_DELAY_MS
      && event.fallDurationMs > 0
      && event.expiresAtOffsetMs === event.spawnedAtOffsetMs + event.fallDurationMs
      && (index === 0 || event.spawnedAtOffsetMs > plan[index - 1].spawnedAtOffsetMs)
      && event.normalizedX >= 0 && event.normalizedX <= 10_000;
  });
}
export function plausibleEventTime(
  elapsedMs: number,
  event: { spawnedAtOffsetMs: number; expiresAtOffsetMs: number },
  eventType: "TAP" | "MISS" = "TAP",
) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  return eventType === "MISS"
    ? elapsedMs >= event.expiresAtOffsetMs - 150 && elapsedMs <= event.expiresAtOffsetMs + CATCH_RUSH_MISS_TOLERANCE_MS
    : elapsedMs >= event.spawnedAtOffsetMs - CATCH_RUSH_EARLY_TOLERANCE_MS
      && elapsedMs <= event.expiresAtOffsetMs + CATCH_RUSH_LATE_TOLERANCE_MS;
}
