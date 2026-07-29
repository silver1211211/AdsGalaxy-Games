import { describe, expect, it } from "vitest";
import { CATCH_RUSH_DISTRIBUTION, levelConfig } from "./config";
import { CATCH_RUSH_FIRST_SPAWN_DELAY_MS, activeElapsed, catchRushSessionHealth, freshCatchRushState, generateStage, performanceRating, plausibleEventTime, validateDistribution, validateStagePlan } from "./engine";
describe("Catch Rush deterministic engine", () => {
  it("generates a stable normalized falling plan", () => {
    const a = generateStage("seed", 4, 10), b = generateStage("seed", 4, 10);
    expect(a).toEqual(b);
    expect(a.every((e) => e.normalizedX >= 1000 && e.normalizedX <= 9000 && e.movementType === "DRIFT_DOWN")).toBe(true);
  });
  it("validates distribution and Money caps", () => {
    expect(validateDistribution(CATCH_RUSH_DISTRIBUTION)).toBe(true);
    expect(validateDistribution({ coin: 50, money: 60 })).toBe(false);
    for (let level = 1; level <= 10; level++) expect(generateStage("cap", level, 10).filter((e) => e.itemType === "MONEY").length).toBeLessThanOrEqual(levelConfig(level).moneyCap);
  });
  it("makes level ten materially faster than level one", () => {
    expect(levelConfig(10).fallDurationMs).toBeLessThan(levelConfig(1).fallDurationMs);
    expect(levelConfig(10).spawnIntervalMs).toBeLessThan(levelConfig(1).spawnIntervalMs);
  });
  it("uses authoritative pause-adjusted elapsed time and ratings", () => {
    expect(activeElapsed(new Date(0), new Date(10_000), 2_000)).toBe(8_000);
    expect(performanceRating(1, 1_000)).toBe(3);
  });
  it("marks Bombs optional and rewards/standards required", () => {
    const plan = generateStage("rules", 10, 10);
    expect(plan.every((e) => e.itemClass === "HAZARD" ? !e.required : e.required)).toBe(true);
  });
  it("creates a non-empty validated plan whose first object does not expire immediately", () => {
    const plan = generateStage("fresh-session", 1, 10);
    expect(validateStagePlan(plan)).toBe(true);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].spawnedAtOffsetMs).toBe(CATCH_RUSH_FIRST_SPAWN_DELAY_MS);
    expect(plan[0].expiresAtOffsetMs).toBeGreaterThan(plan[0].spawnedAtOffsetMs);
  });
  it("accepts valid taps with bounded latency and rejects early or stale requests", () => {
    const event = generateStage("timing", 1, 10)[0];
    expect(plausibleEventTime(event.spawnedAtOffsetMs, event, "TAP")).toBe(true);
    expect(plausibleEventTime(event.expiresAtOffsetMs + 700, event, "TAP")).toBe(true);
    expect(plausibleEventTime(event.spawnedAtOffsetMs - 1_000, event, "TAP")).toBe(false);
    expect(plausibleEventTime(event.expiresAtOffsetMs + 10_000, event, "TAP")).toBe(false);
    expect(plausibleEventTime(event.expiresAtOffsetMs + 200, event, "MISS")).toBe(true);
  });
  it("clamps negative active elapsed and never mixes seconds with milliseconds", () => {
    expect(activeElapsed(new Date(10_000), new Date(9_000), 0)).toBe(0);
    expect(activeElapsed(new Date(0), new Date(1_250), 250)).toBe(1_000);
  });
  it("defines a clean READY state and rejects stale or corrupted restoration", () => {
    expect(freshCatchRushState()).toMatchObject({ status: "READY", score: 0, combo: 0, startedAt: null, waveStartedAt: null });
    const future = new Date(20_000), now = new Date(10_000);
    expect(catchRushSessionHealth({ ...freshCatchRushState(), eventCount: 8, expiresAt: future, now })).toBe("VALID");
    expect(catchRushSessionHealth({ ...freshCatchRushState(), score: 259, eventCount: 8, expiresAt: future, now })).toBe("CORRUPTED");
    expect(catchRushSessionHealth({ status: "ACTIVE", startedAt: null, waveStartedAt: null, score: 0, combo: 0, eventCount: 8, expiresAt: future, now })).toBe("CORRUPTED");
    expect(catchRushSessionHealth({ ...freshCatchRushState(), eventCount: 8, expiresAt: new Date(9_000), now })).toBe("EXPIRED");
  });
});
