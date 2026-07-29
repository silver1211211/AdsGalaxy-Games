import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getMemorySettings } from "@/features/memory-match/server";
import { opaqueAdReference, rewardPurpose } from "@/lib/ads/adsgalaxy-server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const session = await requireSession();
    const { claimId } = await params;
    const [claim, settings, ads, platform] = await Promise.all([
      prisma.gameRewardClaim.findFirst({
        where: {
          id: claimId,
          miniAppId: session.miniAppId,
          userId: session.userId,
        },
      }),
      getMemorySettings(session.miniAppId),
      prisma.adsGalaxyConfiguration.findUnique({
        where: { miniAppId: session.miniAppId },
      }),
      prisma.platformIntegrationSettings.findUnique({ where: { id: "platform" } }),
    ]);
    if (!claim)
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    const purpose = rewardPurpose(claim.gameKey, claim.rewardType, claim.claimContext);
    if (!purpose) return NextResponse.json({ error: "Unsupported rewarded-ad purpose" }, { status: 400 });
    if (claim.expiresAt <= new Date())
      return NextResponse.json({ error: "Claim expired" }, { status: 410 });
    if (claim.nextRetryAt && claim.nextRetryAt > new Date())
      return NextResponse.json(
        { error: "Retry cooldown is active", nextRetryAt: claim.nextRetryAt },
        { status: 429 },
      );
    if (claim.retryCount >= settings.maxAdRetries)
      return NextResponse.json(
        { error: "Maximum ad retries reached" },
        { status: 429 },
      );
    if (claim.mazeRunnerAttemptId) {
      const mazeAttempt = await prisma.mazeRunnerAttempt.findUniqueOrThrow({ where: { id: claim.mazeRunnerAttemptId } });
      const mazeSettings = await prisma.mazeRunnerSettings.findUniqueOrThrow({ where: { miniAppId: claim.miniAppId } });
      const nextAt = mazeAttempt.lastAdRequestedAt
        ? new Date(mazeAttempt.lastAdRequestedAt.getTime() + mazeSettings.adCooldownSeconds * 1000)
        : null;
      if (nextAt && nextAt > new Date()) return NextResponse.json({ error: "Another ad boost will be available soon.", nextRetryAt: nextAt }, { status: 429 });
      if (mazeAttempt.adCount >= mazeSettings.maxAdsPerAttempt) return NextResponse.json({ error: "Ad boost limit reached for this attempt." }, { status: 429 });
    }
    if (
      (claim.gameKey === "memory-match" && (!settings.rewardedAdsEnabled || settings.emergencyDisabled)) ||
      platform?.adsGalaxyEmergencyDisabled ||
      !ads?.enabled ||
      !ads.miniAppPublicId ||
      !ads.webhookSecretEncrypted ||
      !ads.privateApiKeyEncrypted
    ) {
      return NextResponse.json(
        { error: "Rewarded ads are unavailable" },
        { status: 503 },
      );
    }
    const providerMiniAppId = Number(ads.miniAppPublicId);
    if (!Number.isSafeInteger(providerMiniAppId) || providerMiniAppId <= 0)
      return NextResponse.json({ error: "Ads Galaxy Mini App ID is invalid" }, { status: 503 });
    const publicReference = opaqueAdReference();
    const adRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.adsGalaxyAdRequest.upsert({
        where: { claimId_purpose: { claimId: claim.id, purpose } },
        create: {
          publicReference,
          miniAppId: claim.miniAppId,
          userId: claim.userId,
          claimId: claim.id,
          purpose,
          providerMiniAppId,
          expiresAt: claim.expiresAt,
        },
        update: {},
      });
      await Promise.all([
      tx.gameRewardClaim.update({
        where: { id: claim.id },
        data: {
          status: "AD_REQUESTED",
          internalAdRequestId: created.publicReference,
          adRequestedAt: new Date(),
          retryCount: { increment: 1 },
          errorCode: null,
          errorMessage: null,
        },
      }),
      ...(claim.attemptId ? [tx.memoryMatchAttempt.updateMany({
        where: { id: claim.attemptId, status: "ACTIVE" },
        data: {
          status: "PAUSED",
          pausedAt: new Date(),
          version: { increment: 1 },
        },
      })] : []),
      ...(claim.mazeRunnerAttemptId ? [tx.mazeRunnerAttempt.update({
        where: { id: claim.mazeRunnerAttemptId },
        data: { lastAdRequestedAt: new Date(), adCount: { increment: 1 } },
      })] : []),
      ]);
      return created;
    });
    return NextResponse.json({
      requestId: adRequest.publicReference,
      adsGalaxyMiniAppId: ads.miniAppPublicId,
      environment: ads.environment,
      context: purpose.toLowerCase(),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not request ad" },
      { status: 400 },
    );
  }
}
