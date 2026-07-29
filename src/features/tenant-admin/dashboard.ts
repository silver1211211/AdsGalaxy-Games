import { prisma } from "@/lib/prisma";

export async function getTenantAdminDashboard(miniAppId: string) {
  const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    users, activeToday, wallet, pendingWithdrawals, pendingAmount,
    gameRewards, taskRewards, taskPending, recentAudit, unreadNotifications
  ] = await Promise.all([
    prisma.miniAppMembership.count({ where: { miniAppId, status: "ACTIVE" } }),
    prisma.miniAppMembership.count({ where: { miniAppId, status: "ACTIVE", lastActiveAt: { gte: day } } }),
    prisma.wallet.aggregate({ where: { miniAppId }, _sum: { availableBalance: true, pendingBalance: true, withdrawalHoldBalance: true, lifetimeEarnings: true } }),
    prisma.withdrawal.count({ where: { miniAppId, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } } }),
    prisma.withdrawal.aggregate({ where: { miniAppId, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } }, _sum: { amount: true } }),
    prisma.walletTransaction.aggregate({ where: { miniAppId, type: "GAME_REWARD", status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
    prisma.walletTransaction.aggregate({ where: { miniAppId, type: "TASK_REWARD", status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
    prisma.taskAttempt.count({ where: { miniAppId, status: { in: ["PENDING_REVIEW", "PENDING_VERIFICATION"] } } }),
    prisma.adminAuditLog.findMany({ where: { miniAppId }, orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } }),
    prisma.tenantAdminNotification.count({ where: { miniAppId, readAt: null } })
  ]);
  return {
    users: { total: users, activeToday },
    wallet: {
      available: wallet._sum.availableBalance?.toString() ?? "0",
      pending: wallet._sum.pendingBalance?.toString() ?? "0",
      held: wallet._sum.withdrawalHoldBalance?.toString() ?? "0",
      lifetime: wallet._sum.lifetimeEarnings?.toString() ?? "0"
    },
    withdrawals: { pending: pendingWithdrawals, amount: pendingAmount._sum.amount?.toString() ?? "0" },
    rewards: {
      games: gameRewards._sum.amount?.toString() ?? "0", gameClaims: gameRewards._count,
      tasks: taskRewards._sum.amount?.toString() ?? "0", taskClaims: taskRewards._count
    },
    taskPending,
    unreadNotifications,
    recentAudit
  };
}
