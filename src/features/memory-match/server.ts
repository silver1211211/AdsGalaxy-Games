import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvedGamePlatformConfig } from "@/features/super-admin/game-platform";
import { getLevel } from "./config";
import { maskDeck, selectRewardAssignment } from "./engine";
import { calculateScore, calculateStars, applyMultiplier } from "./scoring";
import type { AttemptView, RewardAssignment, ServerCard } from "./types";

export const SETTINGS_DEFAULTS = {
  specialCardsEnabled: true, moneyMatchEnabled: true, coinMatchEnabled: true,
  coinProbabilityEarly: 35, optionAWeight: 50, optionBWeight: 20, optionCWeight: 30
};

export async function getMemorySettings(miniAppId: string) {
  const [settings,platform]=await Promise.all([prisma.memoryMatchSettings.upsert({
    where: { miniAppId },
    create: { miniAppId },
    update: {}
  }),resolvedGamePlatformConfig("memory-match",miniAppId)]);
  return {...settings,enabled:settings.enabled&&platform.enabled,emergencyDisabled:settings.emergencyDisabled||!platform.enabled,...platform.configuration};
}

export function elapsedSeconds(attempt: {
  startedAt: Date; pausedDurationSeconds: number; pausedAt: Date | null; status: string; completedAt: Date | null;
}) {
  const endpoint = attempt.completedAt ?? attempt.pausedAt ?? new Date();
  return Math.max(0, Math.floor((endpoint.getTime() - attempt.startedAt.getTime()) / 1000) - attempt.pausedDurationSeconds);
}

export async function serializeAttempt(attemptId: string): Promise<AttemptView> {
  const attempt = await prisma.memoryMatchAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { claims: { orderBy: { createdAt: "asc" } } }
  });
  const board = attempt.board as unknown as ServerCard[];
  const assignment = attempt.rewardAssignment as unknown as RewardAssignment;
  const level = getLevel(attempt.level);
  return {
    id: attempt.id, level: attempt.level, status: attempt.status,
    cards: maskDeck(board, attempt.firstSelectedIndex),
    moves: attempt.moves, mismatches: attempt.mismatches,
    matchedPairs: board.filter((card) => card.matched).length / 2,
    currentCombo: attempt.currentCombo, highestCombo: attempt.highestCombo,
    shuffleCount: attempt.shuffleCount,
    shuffleWarning: level.shuffleWarningAt !== null && attempt.shuffleCount < level.maxShuffles
      ? `Board shuffle in ${Math.max(0, level.shuffleWarningAt - (attempt.mismatches % (level.shuffleAfterMismatches ?? 999)))} mistake${Math.max(0, level.shuffleWarningAt - (attempt.mismatches % (level.shuffleAfterMismatches ?? 999))) === 1 ? "" : "s"}`
      : null,
    elapsedSeconds: elapsedSeconds(attempt),
    score: attempt.status === "COMPLETED" ? attempt.finalPoints : 0,
    stars: attempt.stars,
    basePoints: attempt.basePoints,
    finalPoints: attempt.finalPoints,
    assignment,
    claims: attempt.claims.filter((claim) => claim.rewardType === "MONEY" || claim.rewardType === "COIN").map((claim) => ({
      id: claim.id, pairSlot: claim.pairSlot, rewardType: claim.rewardType as "MONEY" | "COIN", status: claim.status,
      configuredMoneyAmount: claim.configuredMoneyAmount?.toFixed(2) ?? null,
      issuedMultiplier: claim.issuedMultiplier,
      nextRetryAt: claim.nextRetryAt?.toISOString() ?? null,
      expiresAt: claim.expiresAt.toISOString(), retryCount: claim.retryCount
    })),
    version: attempt.version
  };
}

export async function finalizeAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.memoryMatchAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { claims: true } });
    if (attempt.status === "COMPLETED") return attempt;
    const board = attempt.board as unknown as ServerCard[];
    if (!board.every((card) => card.matched)) throw new Error("All pairs are not matched");
    const elapsed = elapsedSeconds(attempt);
    const input = { level: attempt.level, moves: attempt.moves, mismatches: attempt.mismatches, elapsedSeconds: elapsed, highestCombo: attempt.highestCombo, shuffleCount: attempt.shuffleCount };
    const basePoints = calculateScore(input);
    const verifiedCoin = attempt.claims.find((claim) => claim.rewardType === "COIN" && ["VERIFIED", "CREDITED"].includes(claim.status) && claim.issuedMultiplier);
    const finalPoints = verifiedCoin?.issuedMultiplier ? applyMultiplier(basePoints, verifiedCoin.issuedMultiplier) : basePoints;
    const stars = calculateStars(input);
    const existing = await tx.pointTransaction.findUnique({ where: { attemptId: attempt.id } });
    if (!existing) {
      const aggregate = await tx.pointTransaction.aggregate({ where: { miniAppId: attempt.miniAppId, userId: attempt.userId }, _sum: { amount: true } });
      await tx.pointTransaction.create({
        data: {
          miniAppId: attempt.miniAppId, userId: attempt.userId, attemptId: attempt.id,
          amount: finalPoints, balanceAfter: (aggregate._sum.amount ?? 0) + finalPoints,
          type: "GAME_REWARD", referenceId: `memory-match:attempt:${attempt.id}:points`,
          description: `Memory Match Points · Level ${attempt.level}`,
          metadata: { basePoints, multiplier: verifiedCoin?.issuedMultiplier ?? 1000, finalPoints }
        }
      });
    }
    return tx.memoryMatchAttempt.update({
      where: { id: attempt.id },
      data: { status: "COMPLETED", completedAt: new Date(), basePoints, finalPoints, stars, firstSelectedIndex: null, version: { increment: 1 } }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
