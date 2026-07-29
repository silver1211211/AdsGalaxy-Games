import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Internal only: call after an authenticated provider event has moved the claim to VERIFIED. */
export async function creditVerifiedMoneyClaim(claimId: string, providerEventId: string) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.gameRewardClaim.findUniqueOrThrow({ where: { id: claimId } });
    if (!claim.attemptId || claim.gameKey !== "memory-match") throw new Error("Claim is not a Memory Match claim");
    if (claim.rewardType !== "MONEY" || claim.status !== "VERIFIED" || !claim.providerVerifiedAt || claim.providerEventId !== providerEventId) {
      throw new Error("Claim is not provider verified");
    }
    if (claim.creditedAt) return claim;
    const settings = await tx.memoryMatchSettings.findUniqueOrThrow({ where: { miniAppId: claim.miniAppId } });
    if (settings.emergencyDisabled) throw new Error("Rewards are disabled");
    const amount = claim.configuredMoneyAmount ?? settings.moneyRewardAmount;
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const [userClaims, userWallet, appWallet] = await Promise.all([
      tx.gameRewardClaim.count({ where: { miniAppId: claim.miniAppId, userId: claim.userId, rewardType: "MONEY", creditedAt: { gte: dayStart } } }),
      tx.walletTransaction.aggregate({ where: { miniAppId: claim.miniAppId, userId: claim.userId, status: "COMPLETED", createdAt: { gte: dayStart }, type: "GAME_REWARD" }, _sum: { amount: true } }),
      tx.walletTransaction.aggregate({ where: { miniAppId: claim.miniAppId, status: "COMPLETED", createdAt: { gte: dayStart }, type: "GAME_REWARD" }, _sum: { amount: true } })
    ]);
    if (userClaims >= settings.maxMoneyClaimsUserDay) throw new Error("Daily Money claim cap reached");
    if ((userWallet._sum.amount ?? new Prisma.Decimal(0)).plus(amount).gt(settings.maxWalletUserDay)) throw new Error("Daily user wallet cap reached");
    if ((appWallet._sum.amount ?? new Prisma.Decimal(0)).plus(amount).gt(settings.maxWalletMiniAppDay)) throw new Error("Daily Mini App wallet cap reached");
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { miniAppId_userId: { miniAppId: claim.miniAppId, userId: claim.userId } } });
    const balanceAfter = wallet.availableBalance.plus(amount);
    const transaction = await tx.walletTransaction.create({
      data: {
        miniAppId: claim.miniAppId, userId: claim.userId, walletId: wallet.id, type: "GAME_REWARD", status: "COMPLETED",
        amount, balanceAfter, referenceId: `memory-match:money-claim:${claim.id}`,
        description: `Memory Match Money Reward · Level ${claim.level}`,
        metadata: { claimId: claim.id, providerEventId, verifiedRewardedAd: true }
      }
    });
    await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: balanceAfter, lifetimeEarnings: { increment: amount } } });
    await tx.memoryMatchAttempt.update({ where: { id: claim.attemptId }, data: { walletRewardTotal: { increment: amount }, version: { increment: 1 } } });
    const updated = await tx.gameRewardClaim.update({
      where: { id: claim.id }, data: { status: "CREDITED", creditedAt: new Date(), walletTransactionId: transaction.id }
    });
    await tx.adminAuditLog.create({
      data: { miniAppId: claim.miniAppId, actorUserId: claim.userId, action: "VERIFIED_MONEY_REWARD_CREDITED", targetType: "GameRewardClaim", targetId: claim.id, metadata: { providerEventId, amount: amount.toFixed(6), transactionId: transaction.id } }
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Internal only: issue once after authenticated provider verification. */
export async function issueVerifiedCoinMultiplier(claimId: string, providerEventId: string) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.gameRewardClaim.findUniqueOrThrow({ where: { id: claimId } });
    if (claim.rewardType !== "COIN" || claim.status !== "VERIFIED" || claim.providerEventId !== providerEventId) throw new Error("Claim is not provider verified");
    if (claim.issuedMultiplier) return claim;
    const minimum = claim.configuredMultiplierMin ?? 1200;
    const maximum = claim.configuredMultiplierMax ?? 1500;
    const allowed = [1200, 1300, 1400, 1500].filter((value) => value >= minimum && value <= maximum);
    if (!allowed.length) throw new Error("No valid multiplier configured");
    const entropy = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${claim.id}:${providerEventId}`));
    const selected = allowed[new Uint32Array(entropy)[0] % allowed.length];
    return tx.gameRewardClaim.update({ where: { id: claim.id }, data: { issuedMultiplier: selected, status: "CREDITED", creditedAt: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
