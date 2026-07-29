import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/features/wallet/encryption";

export const AD_PURPOSES = {
  "memory-match:MONEY": "MEMORY_MATCH_MONEY_CLAIM",
  "memory-match:COIN": "MEMORY_MATCH_COIN_CLAIM",
  "quiz-challenge:WALLET": "QUIZ_REWARD_CLAIM",
  "tap-collector:MONEY": "CATCH_RUSH_MONEY_CLAIM",
  "maze-runner:GAME_BENEFIT:MAZE_HINT": "MAZE_RUNNER_HINT",
  "maze-runner:GAME_BENEFIT:MAZE_DOUBLE_POINTS": "MAZE_RUNNER_DOUBLE_POINTS",
  "maze-runner:GAME_BENEFIT:MAZE_CONTINUE": "MAZE_RUNNER_CONTINUE",
  "maze-runner:GAME_BENEFIT:MAZE_FREEZE": "MAZE_RUNNER_HAZARD_FREEZE",
  "maze-runner:GAME_BENEFIT:MAZE_BONUS_CHEST": "MAZE_RUNNER_BONUS_CHEST",
} as const;

export function opaqueAdReference() {
  return `agr_${randomBytes(24).toString("base64url")}`;
}

export function rewardPurpose(gameKey: string, rewardType: string, claimContext?: string | null) {
  return AD_PURPOSES[`${gameKey}:${rewardType}:${claimContext || ""}` as keyof typeof AD_PURPOSES]
    ?? AD_PURPOSES[`${gameKey}:${rewardType}` as keyof typeof AD_PURPOSES] ?? null;
}

export async function bindProviderRequest(input: {
  adRequestId: string;
  providerRequestId: string;
}) {
  return prisma.adsGalaxyAdRequest.update({
    where: { id: input.adRequestId },
    data: { providerRequestId: input.providerRequestId },
  });
}

export async function verifyWithAdsGalaxy(input: {
  miniAppId: string;
  providerMiniAppId: number;
  providerRequestId: string;
  publicReference: string;
}) {
  const config = await prisma.adsGalaxyConfiguration.findUnique({ where: { miniAppId: input.miniAppId } });
  if (!config?.privateApiKeyEncrypted) return { status: "NOT_CONFIGURED" as const };
  const base = (process.env.ADSGALAXY_API_BASE_URL || "https://app.adsgalaxy.online").replace(/\/+$/, "");
  const response = await fetch(`${base}/api/v1/rewarded/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": decryptSecret(config.privateApiKeyEncrypted),
    },
    body: JSON.stringify({
      mini_app_id: input.providerMiniAppId,
      request_id: input.providerRequestId,
      external_user_reference: input.publicReference,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({})) as {
    error_code?: string;
    event?: { event_id?: string; status?: string; reward_eligible?: boolean };
  };
  if (response.status === 202 && body.error_code === "EVENT_PENDING") return { status: "PENDING" as const };
  if (!response.ok) return { status: "FAILED" as const, code: body.error_code || `HTTP_${response.status}` };
  return { status: "VERIFIED" as const, event: body.event };
}

export async function settleVerifiedAdRequest(adRequestId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ads_galaxy_ad_requests WHERE id = ${adRequestId} FOR UPDATE
    `;
    if (!rows[0]) throw new Error("AD_REQUEST_NOT_FOUND");
    const adRequest = await tx.adsGalaxyAdRequest.findUniqueOrThrow({
      where: { id: adRequestId },
      include: { claim: true },
    });
    if (adRequest.settledAt || adRequest.claim.status === "CREDITED") {
      return { credited: true, replay: true, claimId: adRequest.claimId };
    }
    if (adRequest.verificationStatus !== "PROVIDER_VERIFIED") throw new Error("PROVIDER_NOT_VERIFIED");
    const claim = adRequest.claim;
    if (claim.expiresAt <= new Date()) throw new Error("CLAIM_EXPIRED");

    if (claim.rewardType === "MONEY" || claim.rewardType === "WALLET") {
      if (!claim.configuredMoneyAmount || claim.configuredMoneyAmount.lte(0)) throw new Error("INVALID_STORED_REWARD");
      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { miniAppId_userId: { miniAppId: claim.miniAppId, userId: claim.userId } },
      });
      const referenceId = `adsgalaxy:money-claim:${claim.id}`;
      const existing = await tx.walletTransaction.findUnique({
        where: { miniAppId_referenceId: { miniAppId: claim.miniAppId, referenceId } },
      });
      if (!existing) {
        const after = wallet.availableBalance.add(claim.configuredMoneyAmount);
        const transaction = await tx.walletTransaction.create({
          data: {
            miniAppId: claim.miniAppId,
            userId: claim.userId,
            walletId: wallet.id,
            type: "GAME_REWARD",
            status: "COMPLETED",
            amount: claim.configuredMoneyAmount,
            balanceBefore: wallet.availableBalance,
            balanceAfter: after,
            referenceId,
            description: `${claim.gameKey} verified Ads Galaxy reward`,
            completedAt: new Date(),
            metadata: { claimId: claim.id, providerEventId: adRequest.providerEventId, purpose: adRequest.purpose },
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: after,
            lifetimeEarnings: { increment: claim.configuredMoneyAmount },
          },
        });
        await tx.gameRewardClaim.update({
          where: { id: claim.id },
          data: { status: "CREDITED", creditedAt: new Date(), walletTransactionId: transaction.id },
        });
      }
    } else if (claim.rewardType === "COIN" || claim.rewardType === "POINT_MULTIPLIER") {
      const min = claim.configuredMultiplierMin ?? 1000;
      const max = claim.configuredMultiplierMax ?? min;
      const issuedMultiplier = Math.max(min, Math.min(max, min));
      await tx.gameRewardClaim.update({
        where: { id: claim.id },
        data: { status: "VERIFIED", issuedMultiplier, providerVerifiedAt: new Date() },
      });
    } else {
      await tx.gameRewardClaim.update({
        where: { id: claim.id },
        data: { status: "VERIFIED", providerVerifiedAt: new Date() },
      });
    }
    await tx.adsGalaxyAdRequest.update({
      where: { id: adRequest.id },
      data: { settledAt: new Date(), verificationStatus: "SETTLED" },
    });
    return { credited: true, replay: false, claimId: claim.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reconcileSignedCallbackForRequest(adRequestId: string) {
  const adRequest = await prisma.adsGalaxyAdRequest.findUniqueOrThrow({ where: { id: adRequestId } });
  if (!adRequest.providerRequestId) return false;
  const event = await prisma.adsGalaxyCallbackEvent.findFirst({
    where: {
      miniAppId: adRequest.miniAppId,
      providerRequestId: adRequest.providerRequestId,
      processingStatus: "UNMATCHED",
      eventType: "reward.eligible",
      providerStatus: "eligible",
      rewardEligible: true,
      verificationLevel: { in: ["ads_galaxy_validated", "provider_verified"] },
    },
    orderBy: { receivedAt: "asc" },
  });
  if (!event) return false;
  await prisma.$transaction([
    prisma.adsGalaxyCallbackEvent.update({
      where: { id: event.id },
      data: { adRequestId, processingStatus: "VERIFIED", processedAt: new Date(), failureCode: null },
    }),
    prisma.adsGalaxyAdRequest.update({
      where: { id: adRequestId },
      data: {
        providerEventId: event.providerEventId,
        providerStatus: event.providerStatus,
        verificationStatus: "PROVIDER_VERIFIED",
        callbackReceivedAt: event.receivedAt,
        verifiedAt: new Date(),
      },
    }),
    prisma.gameRewardClaim.update({
      where: { id: adRequest.claimId },
      data: { status: "VERIFIED", providerEventId: event.providerEventId, providerVerifiedAt: new Date() },
    }),
  ]);
  await settleVerifiedAdRequest(adRequestId);
  return true;
}
