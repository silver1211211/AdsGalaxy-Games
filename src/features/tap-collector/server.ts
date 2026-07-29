import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvedGamePlatformConfig } from "@/features/super-admin/game-platform";
import { activeElapsed, freshCatchRushState, generateStage, performanceRating, plausibleEventTime, validateStagePlan } from "./engine";
import { CATCH_RUSH_DISTRIBUTION, CATCH_RUSH_LEVELS, levelConfig } from "./config";

export async function getTapSettings(miniAppId: string) {
  const [settings, platform] = await Promise.all([
    prisma.tapCollectorSettings.upsert({ where: { miniAppId }, create: { miniAppId }, update: {} }),
    resolvedGamePlatformConfig("tap-collector", miniAppId),
  ]);
  return { ...settings, enabled: settings.enabled && platform.enabled, emergencyDisabled: settings.emergencyDisabled || !platform.enabled, ...platform.configuration };
}
export async function unlockedLevel(miniAppId: string, userId: string) {
  const completed = await prisma.tapCollectorSession.findMany({ where: { miniAppId, userId, status: "COMPLETED" }, select: { level: true } });
  const levels = new Set(completed.map((x) => x.level));
  let unlocked = 1;
  while (unlocked < 10 && levels.has(unlocked)) unlocked++;
  return unlocked;
}
export async function createTapSession(miniAppId: string, userId: string, level: number) {
  const settings = await getTapSettings(miniAppId);
  if (!settings.enabled || settings.emergencyDisabled) throw new Error("Catch Rush is unavailable");
  if (level < 1 || level > 10 || level > await unlockedLevel(miniAppId, userId)) throw new Error("Complete the previous level first");
  const seed = crypto.randomUUID(), now = new Date(), config = levelConfig(level);
  const plan = generateStage(seed, level, settings.coinPoints), finishEstimate = plan.at(-1)!.expiresAtOffsetMs;
  if (!validateStagePlan(plan)) throw new Error("Catch Rush event plan is invalid");
  const session = await prisma.tapCollectorSession.create({
    data: {
      miniAppId, userId, mode: "CLASSIC", level, seed, totalWaves: 1, ...freshCatchRushState(), health: 1,
      expiresAt: new Date(now.getTime() + Math.max(900_000, finishEstimate + 600_000)),
      configSnapshot: { game: "catch-rush", ...config, distribution: CATCH_RUSH_DISTRIBUTION, coinPoints: settings.coinPoints },
      totalSpawned: plan.length, events: { create: plan.map((event) => ({ ...event, wave: 1 })) },
    },
  });
  return serializeTapSession(session.id);
}
export async function serializeTapSession(id: string) {
  const session = await prisma.tapCollectorSession.findUnique({ where: { id }, include: { events: { orderBy: { sequence: "asc" } }, claims: true } });
  if (!session) throw new Error("Session not found");
  const best = await prisma.tapCollectorSession.aggregate({
    where: { miniAppId: session.miniAppId, userId: session.userId, level: session.level, status: "COMPLETED" }, _min: { activeElapsedMs: true },
  });
  const now = new Date();
  const endedAt = session.completedAt || now;
  const authoritativeElapsedMs = session.waveStartedAt
    ? activeElapsed(session.waveStartedAt, endedAt, session.pausedMs + (session.pausedAt ? Math.max(0, endedAt.getTime() - session.pausedAt.getTime()) : 0))
    : 0;
  const nextEvent = session.events.find((event) => event.status === "SCHEDULED");
  return { ...session, walletRewardTotal: session.walletRewardTotal.toFixed(2), serverTime: now.toISOString(), bestTimeMs: best._min.activeElapsedMs,
    authoritativeElapsedMs, activeEventCount: session.events.filter((event) => event.status === "SCHEDULED"
      && authoritativeElapsedMs >= event.spawnedAtOffsetMs && authoritativeElapsedMs <= event.expiresAtOffsetMs).length,
    nextEventSpawnOffsetMs: nextEvent?.spawnedAtOffsetMs ?? null,
    events: session.events.map(({ processedKey, ...event }) => event),
    claims: session.claims.map((c) => ({ id: c.id, tapSpawnEventId: c.tapSpawnEventId, status: c.status, rewardType: c.rewardType, internalAdRequestId: c.internalAdRequestId })) };
}
export async function startTapSession(miniAppId: string, userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.tapCollectorSession.findFirstOrThrow({
      where: { id, miniAppId, userId },
      include: { events: { orderBy: { sequence: "asc" } } },
    });
    if (session.status === "ACTIVE") return session;
    if (session.status !== "READY" || session.startedAt || session.waveStartedAt) throw new Error("Session cannot be started");
    const config = session.configSnapshot as Record<string, unknown>;
    const plan = session.events.map((event) => ({
      sequence: event.sequence, itemType: event.itemType, itemClass: event.itemClass, itemKey: event.itemKey,
      required: event.required, normalizedX: event.normalizedX, normalizedY: event.normalizedY, lane: event.lane,
      speedTier: event.speedTier, baseValue: event.baseValue, spawnedAtOffsetMs: event.spawnedAtOffsetMs,
      expiresAtOffsetMs: event.expiresAtOffsetMs, fallDurationMs: event.fallDurationMs, movementType: "DRIFT_DOWN" as const,
    }));
    if (!validateStagePlan(plan) || Number(config.eventCount || 0) !== plan.length) throw new Error("Catch Rush event plan is invalid");
    const now = new Date(), finish = plan.at(-1)!.expiresAtOffsetMs;
    return tx.tapCollectorSession.update({
      where: { id }, data: { status: "ACTIVE", startedAt: now, waveStartedAt: now,
        waveEndsAt: new Date(now.getTime() + finish), lastActivityAt: now, version: { increment: 1 } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
type EventInput = { spawnEventId: string; eventType: "TAP" | "MISS"; idempotencyKey: string; version: number };
export async function processTap(miniAppId: string, userId: string, sessionId: string, input: EventInput) {
  await prisma.$transaction(async (tx) => {
    const session = await tx.tapCollectorSession.findFirst({ where: { id: sessionId, miniAppId, userId } });
    if (!session) throw new Error("Session not found");
    if (session.version !== input.version) throw new Error("STALE_VERSION");
    if (session.status !== "ACTIVE") throw new Error("Attempt is paused");
    if (await tx.tapCollectorSpawnEvent.findUnique({ where: { processedKey: input.idempotencyKey } })) return;
    const event = await tx.tapCollectorSpawnEvent.findFirst({ where: { id: input.spawnEventId, sessionId } });
    if (!event || event.status !== "SCHEDULED") throw new Error("Event already resolved");
    if (!session.waveStartedAt) throw new Error("SESSION_TIMING_INVALID");
    const elapsed = activeElapsed(session.waveStartedAt, new Date(), session.pausedMs);
    if (!plausibleEventTime(elapsed, event, input.eventType)) throw new Error("EVENT_TIMING_INVALID");
    const now = new Date();
    if (input.eventType === "MISS") {
      await tx.tapCollectorSpawnEvent.update({ where: { id: event.id }, data: { status: "MISSED", missedAt: now, processedKey: input.idempotencyKey } });
      await tx.tapCollectorSession.update({ where: { id: sessionId }, data: event.required ? {
        status: "GAME_OVER", failureCause: event.itemClass === "COIN_REWARD" ? "MISSED_COIN" : event.itemClass === "MONEY_REWARD" ? "MISSED_MONEY" : "MISSED_COLLECTIBLE",
        failedEventId: event.id, missedCount: { increment: 1 }, activeElapsedMs: elapsed, completedAt: now, version: { increment: 1 },
      } : { lastInteractionAt: now, version: { increment: 1 } } });
      return;
    }
    await tx.tapCollectorSpawnEvent.update({ where: { id: event.id }, data: { status: "COLLECTED", collectedAt: now, processedKey: input.idempotencyKey } });
    if (event.itemClass === "HAZARD") {
      await tx.tapCollectorSession.update({ where: { id: sessionId }, data: { status: "GAME_OVER", failureCause: "BOMB_TAPPED", failedEventId: event.id,
        harmfulTapCount: { increment: 1 }, activeElapsedMs: elapsed, completedAt: now, version: { increment: 1 } } });
      return;
    }
    if (event.itemClass === "COIN_REWARD") {
      const aggregate = await tx.pointTransaction.aggregate({ where: { miniAppId, userId }, _sum: { amount: true } });
      await tx.pointTransaction.create({ data: { miniAppId, userId, amount: event.baseValue, balanceAfter: (aggregate._sum.amount ?? 0) + event.baseValue, type: "GAME",
        referenceId: `catch-rush:coin:${event.id}`, description: `Catch Rush Coin · Level ${session.level}`, metadata: { sessionId, eventId: event.id } } });
      await tx.user.update({ where: { id: userId }, data: { totalPoints: { increment: event.baseValue } } });
    }
    if (event.itemClass === "MONEY_REWARD") {
      const settings = await tx.tapCollectorSettings.findUniqueOrThrow({ where: { miniAppId } });
      await tx.gameRewardClaim.upsert({
        where: { tapSpawnEventId_claimContext: { tapSpawnEventId: event.id, claimContext: "MONEY_OBJECT" } },
        create: { miniAppId, userId, gameKey: "tap-collector", tapCollectorSessionId: sessionId, tapSpawnEventId: event.id, wave: 1,
          level: session.level, pairSlot: event.sequence, claimContext: "MONEY_OBJECT", rewardType: "MONEY",
          configuredMoneyAmount: settings.scheduledWalletAmount, status: "MATCHED", expiresAt: new Date(Date.now() + 86_400_000) }, update: {},
      });
      await tx.tapCollectorSession.update({ where: { id: sessionId }, data: { status: "PAUSED", pausedAt: now,
        collectedCount: { increment: 1 }, combo: { increment: 1 }, lastInteractionAt: now, version: { increment: 1 } } });
      return;
    }
    const combo = session.combo + 1;
    await tx.tapCollectorSession.update({ where: { id: sessionId }, data: { score: { increment: event.baseValue }, basePoints: { increment: event.baseValue },
      combo, bestCombo: Math.max(session.bestCombo, combo), collectedCount: { increment: 1 }, lastInteractionAt: now, version: { increment: 1 } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function completeTapSession(miniAppId: string, userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const s = await tx.tapCollectorSession.findFirstOrThrow({ where: { id, miniAppId, userId } });
    if (s.status === "COMPLETED") return s;
    if (s.status !== "ACTIVE") throw new Error("Attempt is not active");
    const unresolved = await tx.tapCollectorSpawnEvent.count({ where: { sessionId: id, status: "SCHEDULED" } });
    if (unresolved) throw new Error("Stage events are not fully resolved");
    if (!s.waveStartedAt) throw new Error("SESSION_TIMING_INVALID");
    const elapsed = activeElapsed(s.waveStartedAt, new Date(), s.pausedMs);
    const stars = performanceRating(s.level, elapsed), bonus = s.level * 25 + stars * 20, final = s.score + bonus;
    const aggregate = await tx.pointTransaction.aggregate({ where: { miniAppId, userId }, _sum: { amount: true } });
    await tx.pointTransaction.upsert({ where: { tapCollectorSessionId: id }, create: { miniAppId, userId, tapCollectorSessionId: id, amount: final,
      balanceAfter: (aggregate._sum.amount ?? 0) + final, type: "GAME", referenceId: `catch-rush:complete:${id}`,
      description: `Catch Rush Level ${s.level} completion`, metadata: { elapsed, stars } }, update: {} });
    await tx.user.update({ where: { id: userId }, data: { totalPoints: { increment: final }, totalGames: { increment: 1 } } });
    return tx.tapCollectorSession.update({ where: { id }, data: { status: "COMPLETED", finalPoints: final, bonusPoints: bonus, stars,
      activeElapsedMs: elapsed, completedAt: new Date(), version: { increment: 1 } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export const levels = CATCH_RUSH_LEVELS;
/** Compatibility endpoint: Catch Rush has one finite stage, not waves. */
export async function nextTapWave(miniAppId: string, userId: string, id: string) {
  return completeTapSession(miniAppId, userId, id);
}
