import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { bfs, generateMaze } from "@/features/maze-runner/engine";
import { getMazeSettings } from "@/features/maze-runner/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const requestActions = [
  "REQUEST_HINT",
  "REQUEST_DOUBLE_POINTS",
  "REQUEST_CONTINUE",
  "REQUEST_FREEZE",
  "REQUEST_BONUS_CHEST",
] as const;
const schema = z.object({
  action: z.enum([...requestActions, "CONSUME"]),
  claimId: z.string().optional(),
}).strict();
const strings = (value: Prisma.JsonValue) => Array.isArray(value) ? value.map(String) : [];
const contexts = {
  REQUEST_HINT: "MAZE_HINT",
  REQUEST_DOUBLE_POINTS: "MAZE_DOUBLE_POINTS",
  REQUEST_CONTINUE: "MAZE_CONTINUE",
  REQUEST_FREEZE: "MAZE_FREEZE",
  REQUEST_BONUS_CHEST: "MAZE_BONUS_CHEST",
} as const;
const slots = {
  MAZE_HINT: 1,
  MAZE_DOUBLE_POINTS: 2,
  MAZE_CONTINUE: 3,
  MAZE_FREEZE: 4,
  MAZE_BONUS_CHEST: 5,
} as const;

type Checkpoint = { x: number; y: number; keys: string[]; gates: string[]; collectibles: string[] };
function checkpoint(value: Prisma.JsonValue | null): Checkpoint | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const row = value as Record<string, Prisma.JsonValue>;
  if (typeof row.x !== "number" || typeof row.y !== "number") return null;
  return {
    x: row.x,
    y: row.y,
    keys: strings(row.keys ?? []),
    gates: strings(row.gates ?? []),
    collectibles: strings(row.collectibles ?? []),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const auth = await requireSession();
    const { reference } = await params;
    const input = schema.parse(await request.json());
    const attempt = await prisma.mazeRunnerAttempt.findFirstOrThrow({
      where: { publicReference: reference, miniAppId: auth.miniAppId, userId: auth.userId },
    });
    const settings = await getMazeSettings(auth.miniAppId);

    if (input.action !== "CONSUME") {
      const context = contexts[input.action];
      if (context === "MAZE_HINT" && (!settings.hintEnabled || attempt.status !== "ACTIVE")) throw new Error("Hint is unavailable");
      if (context === "MAZE_FREEZE" && attempt.status !== "ACTIVE") throw new Error("Hazard Freeze is unavailable");
      if (context === "MAZE_CONTINUE" && (!settings.continueEnabled || attempt.status !== "FAILED" || attempt.livesRemaining < 1)) throw new Error("Continue is unavailable");
      if (context === "MAZE_DOUBLE_POINTS" && (!settings.doublePointsEnabled || attempt.status !== "COMPLETED")) throw new Error("Double Points is unavailable");
      if (context === "MAZE_BONUS_CHEST" && (!settings.bonusChestEnabled || attempt.status !== "COMPLETED")) throw new Error("Bonus Chest is unavailable");
      const used = strings(attempt.boostsUsed);
      if (used.includes(context.replace("MAZE_", ""))) throw new Error("This boost was already used");

      let claim = await prisma.gameRewardClaim.findFirst({
        where: { mazeRunnerAttemptId: attempt.id, claimContext: context },
      });
      if (!claim) {
        claim = await prisma.gameRewardClaim.create({
          data: {
            miniAppId: auth.miniAppId,
            userId: auth.userId,
            gameKey: "maze-runner",
            mazeRunnerAttemptId: attempt.id,
            level: attempt.level,
            pairSlot: slots[context],
            claimContext: context,
            rewardType: "GAME_BENEFIT",
            expiresAt: new Date(Date.now() + 30 * 60_000),
          },
        });
      }
      return Response.json({ claimId: claim.id, status: claim.status });
    }

    if (!input.claimId) return Response.json({ error: "claimId is required" }, { status: 400 });
    const claim = await prisma.gameRewardClaim.findFirstOrThrow({
      where: {
        id: input.claimId,
        mazeRunnerAttemptId: attempt.id,
        miniAppId: auth.miniAppId,
        userId: auth.userId,
      },
    });
    if (claim.status === "CREDITED") return Response.json({ applied: true, context: claim.claimContext, replay: true });
    if (claim.status !== "VERIFIED") return Response.json({ applied: false, status: claim.status }, { status: 202 });

    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.gameRewardClaim.findUniqueOrThrow({ where: { id: claim.id } });
      const current = await tx.mazeRunnerAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      if (locked.status === "CREDITED") return { applied: true, context: locked.claimContext, replay: true };
      if (locked.status !== "VERIFIED") throw new Error("Boost is not verified");
      const used = strings(current.boostsUsed);
      const consume = async (token: string) => {
        await tx.gameRewardClaim.update({ where: { id: locked.id }, data: { status: "CREDITED", creditedAt: new Date() } });
        return [...new Set([...used, token])];
      };

      if (locked.claimContext === "MAZE_HINT") {
        if (current.status !== "ACTIVE") throw new Error("Hint is unavailable");
        const maze = generateMaze(current.level, current.seed);
        const position = { x: current.playerX, y: current.playerY };
        const hasKey = maze.key ? strings(current.keysCollected).includes(maze.key.id) : true;
        const target = !hasKey && maze.key ? maze.key : maze.exit;
        const path = bfs(maze.walls, position, target, !hasKey && maze.gate ? maze.gate : undefined);
        const next = path[1] ?? position;
        const dx = next.x - current.playerX, dy = next.y - current.playerY;
        const direction = dx === 1 ? "RIGHT" : dx === -1 ? "LEFT" : dy === 1 ? "DOWN" : "UP";
        await tx.mazeRunnerAttempt.update({ where: { id: current.id }, data: { boostsUsed: await consume("HINT") } });
        return { applied: true, context: locked.claimContext, hint: direction };
      }
      if (locked.claimContext === "MAZE_FREEZE") {
        if (current.status !== "ACTIVE") throw new Error("Hazard Freeze is unavailable");
        await tx.mazeRunnerAttempt.update({
          where: { id: current.id },
          data: { boostsUsed: await consume("FREEZE"), hazardFreezeMoves: 8 },
        });
        return { applied: true, context: locked.claimContext, freezeMoves: 8 };
      }
      if (locked.claimContext === "MAZE_CONTINUE") {
        if (current.status !== "FAILED" || current.livesRemaining < 1) throw new Error("Continue is unavailable");
        const saved = checkpoint(current.checkpointState) ?? {
          x: generateMaze(current.level, current.seed).start.x,
          y: generateMaze(current.level, current.seed).start.y,
          keys: [], gates: [], collectibles: [],
        };
        await tx.mazeRunnerAttempt.update({
          where: { id: current.id },
          data: {
            status: "ACTIVE", playerX: saved.x, playerY: saved.y,
            keysCollected: saved.keys, gatesOpened: saved.gates, collectiblesCollected: saved.collectibles,
            failureReason: null, failedAt: null, livesRemaining: { decrement: 1 },
            boostsUsed: await consume("CONTINUE"), hazardFreezeMoves: 3, version: { increment: 1 },
          },
        });
        return { applied: true, context: locked.claimContext, continued: true };
      }
      if (locked.claimContext === "MAZE_DOUBLE_POINTS") {
        if (current.status !== "COMPLETED") throw new Error("Double Points is unavailable");
        const referenceId = `maze-runner:double:${current.id}`;
        const existing = await tx.pointTransaction.findUnique({ where: { miniAppId_referenceId: { miniAppId: auth.miniAppId, referenceId } } });
        if (!existing) {
          const user = await tx.user.findUniqueOrThrow({ where: { id: auth.userId } });
          await tx.pointTransaction.create({ data: {
            miniAppId: auth.miniAppId, userId: auth.userId, amount: current.basePoints,
            balanceAfter: user.totalPoints + current.basePoints, type: "GAME_REWARD", referenceId,
            description: `Maze Runner Level ${current.level} Double Points`,
          } });
          await tx.user.update({ where: { id: auth.userId }, data: { totalPoints: { increment: current.basePoints } } });
        }
        const finalPoints = current.basePoints * 2 + current.bonusChestPoints;
        const progress = await tx.mazeRunnerProgress.findUniqueOrThrow({
          where: { miniAppId_userId_level: { miniAppId: auth.miniAppId, userId: auth.userId, level: current.level } },
        });
        await tx.mazeRunnerAttempt.update({ where: { id: current.id }, data: { finalPoints, boostsUsed: await consume("DOUBLE_POINTS") } });
        await tx.mazeRunnerProgress.update({
          where: { miniAppId_userId_level: { miniAppId: auth.miniAppId, userId: auth.userId, level: current.level } },
          data: { bestPoints: Math.max(finalPoints, progress.bestPoints) },
        });
        return { applied: true, context: locked.claimContext, finalPoints };
      }
      if (locked.claimContext === "MAZE_BONUS_CHEST") {
        if (current.status !== "COMPLETED") throw new Error("Bonus Chest is unavailable");
        const digest = createHash("sha256").update(`${current.id}:bonus-chest:v1`).digest();
        const bonus = 1 + digest.readUInt32LE(0) % Math.max(1, settings.bonusChestPoints);
        const referenceId = `maze-runner:bonus:${current.id}`;
        const existing = await tx.pointTransaction.findUnique({ where: { miniAppId_referenceId: { miniAppId: auth.miniAppId, referenceId } } });
        if (!existing) {
          const user = await tx.user.findUniqueOrThrow({ where: { id: auth.userId } });
          await tx.pointTransaction.create({ data: {
            miniAppId: auth.miniAppId, userId: auth.userId, amount: bonus,
            balanceAfter: user.totalPoints + bonus, type: "GAME_REWARD", referenceId,
            description: `Maze Runner Level ${current.level} Bonus Chest`,
          } });
          await tx.user.update({ where: { id: auth.userId }, data: { totalPoints: { increment: bonus } } });
        }
        const finalPoints = current.finalPoints + bonus;
        const progress = await tx.mazeRunnerProgress.findUniqueOrThrow({
          where: { miniAppId_userId_level: { miniAppId: auth.miniAppId, userId: auth.userId, level: current.level } },
        });
        await tx.mazeRunnerAttempt.update({
          where: { id: current.id },
          data: { bonusChestPoints: bonus, finalPoints, boostsUsed: await consume("BONUS_CHEST") },
        });
        await tx.mazeRunnerProgress.update({
          where: { miniAppId_userId_level: { miniAppId: auth.miniAppId, userId: auth.userId, level: current.level } },
          data: { bestPoints: Math.max(finalPoints, progress.bestPoints) },
        });
        return { applied: true, context: locked.claimContext, bonusPoints: bonus, finalPoints };
      }
      throw new Error("Unsupported boost");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json(result);
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json({ error: error instanceof Error ? error.message : "Boost unavailable" }, { status: 422 });
  }
}
