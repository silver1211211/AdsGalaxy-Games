import { prisma } from "@/lib/prisma";
import { effectiveDisplayName, initials } from "./profile";

export async function ensureTenantProfile(miniAppId: string, userId: string) {
  return prisma.miniAppUserProfile.upsert({
    where: { miniAppId_userId: { miniAppId, userId } },
    create: { miniAppId, userId },
    update: {}
  });
}

export async function profileStats(miniAppId: string, userId: string) {
  const completedQuiz = { miniAppId, userId, status: "COMPLETED" as const };
  const completedTap = { miniAppId, userId, status: "COMPLETED" as const };
  const completedMemory = { miniAppId, userId, status: "COMPLETED" as const };
  const [wallet, points, memory, quiz, tap, taskCounts, availableTasks, pendingRewards] = await Promise.all([
    prisma.wallet.findUnique({ where: { miniAppId_userId: { miniAppId, userId } } }),
    prisma.pointTransaction.aggregate({ where: { miniAppId, userId }, _sum: { amount: true }, _count: true }),
    prisma.memoryMatchAttempt.aggregate({ where: completedMemory, _count: true, _max: { level: true, finalPoints: true, stars: true, highestCombo: true } }),
    prisma.quizSession.aggregate({ where: completedQuiz, _count: true, _max: { score: true, bestStreak: true }, _sum: { correctCount: true, incorrectCount: true, timeoutCount: true } }),
    prisma.tapCollectorSession.aggregate({ where: completedTap, _count: true, _max: { score: true, currentWave: true, bestCombo: true }, _sum: { collectedCount: true } }),
    prisma.taskAttempt.groupBy({ by: ["status"], where: { miniAppId, userId }, _count: true }),
    prisma.task.count({ where: { miniAppId, status: "ACTIVE", emergencyDisabled: false } }),
    prisma.gameRewardClaim.aggregate({
      where: { miniAppId, userId, status: { in: ["MATCHED", "AD_REQUESTED", "BROWSER_COMPLETED", "PENDING_VERIFICATION", "VERIFIED"] } },
      _sum: { configuredMoneyAmount: true }, _count: true
    })
  ]);
  const task = Object.fromEntries(taskCounts.map(item => [item.status, item._count]));
  const answered = (quiz._sum.correctCount ?? 0) + (quiz._sum.incorrectCount ?? 0) + (quiz._sum.timeoutCount ?? 0);
  const earned = await prisma.pointTransaction.aggregate({ where: { miniAppId, userId, amount: { gt: 0 } }, _sum: { amount: true } });
  const spent = await prisma.pointTransaction.aggregate({ where: { miniAppId, userId, amount: { lt: 0 } }, _sum: { amount: true } });
  return {
    wallet: {
      availableBalance: wallet?.availableBalance.toFixed(2) ?? "0.00",
      pendingBalance: wallet?.pendingBalance.toFixed(2) ?? "0.00",
      withdrawalHoldBalance: wallet?.withdrawalHoldBalance.toFixed(2) ?? "0.00",
      lifetimeEarnings: wallet?.lifetimeEarnings.toFixed(2) ?? "0.00",
      totalWithdrawn: wallet?.totalWithdrawn.toFixed(2) ?? "0.00",
      pendingRewardValue: pendingRewards._sum.configuredMoneyAmount?.toFixed(2) ?? "0.00",
      pendingRewardCount: pendingRewards._count
    },
    points: { total: points._sum.amount ?? 0, earned: earned._sum.amount ?? 0, spent: Math.abs(spent._sum.amount ?? 0) },
    games: {
      totalCompleted: memory._count + quiz._count + tap._count,
      memory: { completed: memory._count, highestLevel: memory._max.level ?? 0, highScore: memory._max.finalPoints ?? 0, bestStars: memory._max.stars ?? 0, bestCombo: memory._max.highestCombo ?? 0 },
      quiz: { completed: quiz._count, highScore: quiz._max.score ?? 0, averageAccuracy: answered ? Math.round(((quiz._sum.correctCount ?? 0) / answered) * 100) : 0, bestStreak: quiz._max.bestStreak ?? 0 },
      tap: { completed: tap._count, highScore: tap._max.score ?? 0, highestWave: tap._max.currentWave ?? 0, bestCombo: tap._max.bestCombo ?? 0, collectedItems: tap._sum.collectedCount ?? 0 }
    },
    tasks: {
      available: availableTasks,
      started: task.STARTED ?? 0,
      pending: (task.PENDING_REVIEW ?? 0) + (task.PENDING_VERIFICATION ?? 0),
      completed: (task.VERIFIED ?? 0) + (task.APPROVED ?? 0) + (task.REWARDED ?? 0),
      rewarded: task.REWARDED ?? 0
    }
  };
}

export async function safeProfile(miniAppId: string, userId: string) {
  const [membership, profile, stats, deletion] = await Promise.all([
    prisma.miniAppMembership.findUniqueOrThrow({
      where: { miniAppId_userId: { miniAppId, userId } },
      include: { user: true, miniApp: true }
    }),
    ensureTenantProfile(miniAppId, userId),
    profileStats(miniAppId, userId),
    prisma.accountDeletionRequest.findFirst({ where: { miniAppId, userId, status: "PENDING" }, orderBy: { createdAt: "desc" } })
  ]);
  const displayName = effectiveDisplayName(profile.displayNameOverride, membership.user);
  return {
    identity: {
      displayName,
      telegramUsername: membership.user.username,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      avatar: profile.customAvatarKey ? `/api/profile/avatar` : membership.user.avatar,
      initials: initials(displayName),
      telegramManaged: true
    },
    membership: { role: membership.role, status: membership.status, joinedAt: membership.createdAt, lastActiveAt: membership.lastActiveAt },
    account: { status: membership.user.status, deletionRequest: deletion },
    profile: { displayNameOverride: profile.displayNameOverride, bio: profile.bio },
    stats,
    updatedAt: profile.updatedAt
  };
}
