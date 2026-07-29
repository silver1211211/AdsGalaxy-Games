import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvedGamePlatformConfig } from "@/features/super-admin/game-platform";
import { chaserStep, generateMaze, movingHazardPosition, nextPosition, validateMaze, type Point } from "./engine";

const jsonStrings = (value: Prisma.JsonValue) => Array.isArray(value) ? value.map(String) : [];
const pointKey = (p: Point) => `${p.x}:${p.y}`;
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export async function getMazeSettings(miniAppId: string) {
  const [tenant, platform] = await Promise.all([
    prisma.mazeRunnerSettings.upsert({ where: { miniAppId }, create: { miniAppId }, update: {} }),
    resolvedGamePlatformConfig("maze-runner", miniAppId),
  ]);
  const p = platform.configuration;
  return {
    ...tenant,
    enabled: tenant.enabled && platform.enabled,
    emergencyDisabled: tenant.emergencyDisabled || !platform.enabled,
    attemptExpiryMinutes: Number(p.attemptExpiryMinutes ?? tenant.attemptExpiryMinutes),
    adCooldownSeconds: Number(p.adCooldownSeconds ?? tenant.adCooldownSeconds),
    maxAdsPerAttempt: Number(p.maxAdsPerAttempt ?? tenant.maxAdsPerAttempt),
    continueEnabled: Boolean(p.continueEnabled ?? tenant.continueEnabled),
    hintEnabled: Boolean(p.hintEnabled ?? tenant.hintEnabled),
    doublePointsEnabled: Boolean(p.doublePointsEnabled ?? tenant.doublePointsEnabled),
  };
}

export async function mazeProgress(miniAppId: string, userId: string) {
  const rows = await prisma.mazeRunnerProgress.findMany({ where: { miniAppId, userId }, orderBy: { level: "asc" } });
  const completed = new Set(rows.filter((r) => r.completionCount > 0).map((r) => r.level));
  let highestUnlocked = 1;
  while (highestUnlocked < 20 && completed.has(highestUnlocked)) highestUnlocked++;
  return {
    highestUnlocked,
    secondSetUnlocked: completed.has(10),
    completedCount: completed.size,
    levels: Array.from({ length: 20 }, (_, index) => {
      const level = index + 1, row = rows.find((r) => r.level === level);
      return {
        level,
        visible: level <= 10 || completed.has(10),
        unlocked: level <= highestUnlocked,
        completed: Boolean(row?.completionCount),
        bestTimeMs: row?.bestTimeMs ?? null,
        rating: row?.bestRating ?? 0,
      };
    }),
  };
}

export async function createMazeAttempt(miniAppId: string, userId: string, level: number) {
  const [settings, progress] = await Promise.all([getMazeSettings(miniAppId), mazeProgress(miniAppId, userId)]);
  if (!settings.enabled || settings.emergencyDisabled) throw new Error("Maze Runner is unavailable");
  if (!Number.isInteger(level) || level < 1 || level > 20 || level > progress.highestUnlocked) throw new Error("Level is locked");
  const existing = await prisma.mazeRunnerAttempt.findFirst({
    where: { miniAppId, userId, level, status: { in: ["ACTIVE", "PAUSED"] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return serializeMazeAttempt(existing.publicReference);
  const seed = `maze:${level}:v1`, maze = generateMaze(level, seed);
  if (!validateMaze(maze)) throw new Error("Maze generation failed");
  const attempt = await prisma.mazeRunnerAttempt.create({
    data: {
      publicReference: `mra_${crypto.randomUUID().replaceAll("-", "")}`,
      miniAppId, userId, level, seed,
      playerX: maze.start.x, playerY: maze.start.y,
      chaserX: maze.chaserStart?.x, chaserY: maze.chaserStart?.y,
      checkpointState: { x: maze.start.x, y: maze.start.y, keys: [], gates: [], collectibles: [] },
      expiresAt: new Date(Date.now() + settings.attemptExpiryMinutes * 60_000),
    },
  });
  return serializeMazeAttempt(attempt.publicReference);
}

export async function serializeMazeAttempt(publicReference: string) {
  const attempt = await prisma.mazeRunnerAttempt.findUniqueOrThrow({
    where: { publicReference },
    include: { claims: { orderBy: { createdAt: "desc" } } },
  });
  const maze = generateMaze(attempt.level, attempt.seed);
  return {
    publicReference: attempt.publicReference,
    level: attempt.level,
    status: attempt.status,
    position: { x: attempt.playerX, y: attempt.playerY },
    maze: {
      width: maze.width, height: maze.height, walls: maze.walls, start: maze.start, exit: maze.exit,
      key: maze.key && !jsonStrings(attempt.keysCollected).includes(maze.key.id) ? maze.key : null,
      gate: maze.gate && !jsonStrings(attempt.gatesOpened).includes(maze.gate.id) ? maze.gate : null,
      trap: maze.trap,
      movingHazard: movingHazardPosition(maze, attempt.moveCount),
      chaser: attempt.chaserX === null || attempt.chaserY === null ? null : { x: attempt.chaserX, y: attempt.chaserY },
      collectible: jsonStrings(attempt.collectiblesCollected).includes(maze.collectible.id) ? null : maze.collectible,
    },
    keysCollected: jsonStrings(attempt.keysCollected),
    gatesOpened: jsonStrings(attempt.gatesOpened),
    collectiblesCollected: jsonStrings(attempt.collectiblesCollected),
    moveCount: attempt.moveCount,
    version: attempt.version,
    startedAt: attempt.startedAt.toISOString(),
    pausedAt: attempt.pausedAt?.toISOString() ?? null,
    pausedDurationMs: attempt.pausedDurationMs,
    activeElapsedMs: attempt.activeElapsedMs,
    finalPoints: attempt.finalPoints,
    rating: attempt.rating,
    failureReason: attempt.failureReason,
    livesRemaining: attempt.livesRemaining,
    hazardFreezeMoves: attempt.hazardFreezeMoves,
    bonusChestPoints: attempt.bonusChestPoints,
    boostsUsed: jsonStrings(attempt.boostsUsed),
    claims: attempt.claims.map((claim) => ({ id: claim.id, context: claim.claimContext, status: claim.status })),
  };
}

export async function moveMaze(input: {
  miniAppId: string; userId: string; publicReference: string;
  direction: "UP" | "DOWN" | "LEFT" | "RIGHT"; version: number; idempotencyKey: string;
}) {
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.mazeRunnerMove.findFirst({
      where: { attempt: { publicReference: input.publicReference }, idempotencyKey: input.idempotencyKey },
    });
    if (duplicate) return serializeMazeAttempt(input.publicReference);
    const attempt = await tx.mazeRunnerAttempt.findFirstOrThrow({
      where: { publicReference: input.publicReference, miniAppId: input.miniAppId, userId: input.userId },
    });
    if (attempt.status !== "ACTIVE" || attempt.version !== input.version) throw new Error("STALE_ATTEMPT");
    if (attempt.expiresAt <= new Date()) throw new Error("ATTEMPT_EXPIRED");
    const maze = generateMaze(attempt.level, attempt.seed);
    const from = { x: attempt.playerX, y: attempt.playerY }, to = nextPosition(from, input.direction);
    if (to.x < 0 || to.y < 0 || to.x >= maze.width || to.y >= maze.height || maze.walls[to.y][to.x]) throw new Error("INVALID_MOVE");
    const keys = jsonStrings(attempt.keysCollected), gates = jsonStrings(attempt.gatesOpened), collectibles = jsonStrings(attempt.collectiblesCollected);
    if (maze.gate && same(to, maze.gate) && !keys.includes(maze.gate.keyId)) throw new Error("GATE_LOCKED");
    let eventType: string | null = null;
    if (maze.key && same(to, maze.key) && !keys.includes(maze.key.id)) { keys.push(maze.key.id); eventType = "KEY_COLLECTED"; }
    if (maze.gate && same(to, maze.gate) && !gates.includes(maze.gate.id)) { gates.push(maze.gate.id); eventType = "GATE_OPENED"; }
    if (same(to, maze.collectible) && !collectibles.includes(maze.collectible.id)) { collectibles.push(maze.collectible.id); eventType = "COLLECTIBLE"; }
    const nextMoveCount = attempt.moveCount + 1;
    const hazardsFrozen = attempt.hazardFreezeMoves > 0;
    const movingHazard = hazardsFrozen ? null : movingHazardPosition(maze, nextMoveCount);
    let chaser = attempt.chaserX === null || attempt.chaserY === null ? null : { x: attempt.chaserX, y: attempt.chaserY };
    if (!hazardsFrozen && chaser && nextMoveCount >= 4 && nextMoveCount % 2 === 0) chaser = chaserStep(maze, chaser, to);
    const failed = Boolean(
      (maze.trap && same(to, maze.trap))
      || (movingHazard && same(to, movingHazard))
      || (chaser && same(to, chaser)),
    );
    const failureReason = maze.trap && same(to, maze.trap)
      ? "TRAP"
      : movingHazard && same(to, movingHazard)
        ? "MOVING_HAZARD"
        : chaser && same(to, chaser) ? "CHASER" : null;
    const completed = same(to, maze.exit);
    const elapsed = Math.max(0, Date.now() - attempt.startedAt.getTime() - attempt.pausedDurationMs);
    await tx.mazeRunnerMove.create({
      data: { attemptId: attempt.id, moveIndex: attempt.moveCount + 1, idempotencyKey: input.idempotencyKey,
        fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, direction: input.direction,
        result: failed ? "FAILED" : completed ? "COMPLETED" : "MOVED", eventType },
    });
    if (failed) {
      await tx.mazeRunnerAttempt.update({
        where: { id: attempt.id }, data: { playerX: to.x, playerY: to.y, status: "FAILED", failedAt: new Date(),
          failureReason, activeElapsedMs: elapsed, moveCount: { increment: 1 }, version: { increment: 1 },
          chaserX: chaser?.x, chaserY: chaser?.y,
          hazardFreezeMoves: Math.max(0, attempt.hazardFreezeMoves - 1) },
      });
    } else if (completed) {
      const settings = await tx.mazeRunnerSettings.findUniqueOrThrow({ where: { miniAppId: input.miniAppId } });
      const base = settings.baseCompletionPoints + attempt.level * 15 + collectibles.length * settings.collectiblePoints;
      const rating = elapsed <= maze.targetTimeMs ? 3 : elapsed <= maze.parTimeMs ? 2 : 1;
      const priorProgress = await tx.mazeRunnerProgress.findUnique({
        where: { miniAppId_userId_level: { miniAppId: input.miniAppId, userId: input.userId, level: attempt.level } },
      });
      const referenceId = `maze-runner:complete:${attempt.id}`;
      const existingPoints = await tx.pointTransaction.findUnique({ where: { miniAppId_referenceId: { miniAppId: input.miniAppId, referenceId } } });
      if (!existingPoints) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
        await tx.pointTransaction.create({ data: { miniAppId: input.miniAppId, userId: input.userId, amount: base,
          balanceAfter: user.totalPoints + base, type: "GAME_REWARD", referenceId,
          description: `Maze Runner Level ${attempt.level}`, metadata: { elapsed, rating, collectibles: collectibles.length } } });
        await tx.user.update({ where: { id: input.userId }, data: { totalPoints: { increment: base }, totalGames: { increment: 1 } } });
      }
      await tx.mazeRunnerProgress.upsert({
        where: { miniAppId_userId_level: { miniAppId: input.miniAppId, userId: input.userId, level: attempt.level } },
        create: { miniAppId: input.miniAppId, userId: input.userId, level: attempt.level, completionCount: 1,
          bestTimeMs: elapsed, bestRating: rating, bestPoints: base, firstCompletedAt: new Date(), lastCompletedAt: new Date() },
        update: { completionCount: { increment: 1 },
          bestTimeMs: Math.min(priorProgress?.bestTimeMs ?? elapsed, elapsed),
          bestRating: Math.max(priorProgress?.bestRating ?? 0, rating),
          bestPoints: Math.max(priorProgress?.bestPoints ?? 0, base), lastCompletedAt: new Date() },
      });
      await tx.mazeRunnerAttempt.update({ where: { id: attempt.id }, data: { playerX: to.x, playerY: to.y, status: "COMPLETED",
        completedAt: new Date(), activeElapsedMs: elapsed, basePoints: base, finalPoints: base, rating, moveCount: { increment: 1 }, version: { increment: 1 },
        chaserX: chaser?.x, chaserY: chaser?.y, hazardFreezeMoves: Math.max(0, attempt.hazardFreezeMoves - 1),
        keysCollected: keys, gatesOpened: gates, collectiblesCollected: collectibles } });
    } else {
      await tx.mazeRunnerAttempt.update({ where: { id: attempt.id }, data: { playerX: to.x, playerY: to.y,
        keysCollected: keys, gatesOpened: gates, collectiblesCollected: collectibles,
        checkpointState: eventType ? { x: to.x, y: to.y, keys, gates, collectibles } : undefined,
        chaserX: chaser?.x, chaserY: chaser?.y, hazardFreezeMoves: Math.max(0, attempt.hazardFreezeMoves - 1),
        moveCount: { increment: 1 }, version: { increment: 1 } } });
    }
    return { publicReference: attempt.publicReference, eventType, completed, failed };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function pauseMaze(miniAppId: string, userId: string, reference: string, resume: boolean) {
  const attempt = await prisma.mazeRunnerAttempt.findFirstOrThrow({ where: { publicReference: reference, miniAppId, userId } });
  if (resume && attempt.status === "PAUSED" && attempt.pausedAt) {
    return prisma.mazeRunnerAttempt.update({ where: { id: attempt.id }, data: { status: "ACTIVE",
      pausedDurationMs: { increment: Math.max(0, Date.now() - attempt.pausedAt.getTime()) }, pausedAt: null, version: { increment: 1 } } });
  }
  if (!resume && attempt.status === "ACTIVE") return prisma.mazeRunnerAttempt.update({ where: { id: attempt.id }, data: { status: "PAUSED", pausedAt: new Date(), version: { increment: 1 } } });
  return attempt;
}
