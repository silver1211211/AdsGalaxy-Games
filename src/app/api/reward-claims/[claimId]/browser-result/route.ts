import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getMemorySettings } from "@/features/memory-match/server";
import { reconcileSignedCallbackForRequest, verifyWithAdsGalaxy } from "@/lib/ads/adsgalaxy-server";

const schema = z.object({
  requestId: z.string().regex(/^agr_[A-Za-z0-9_-]{20,90}$/),
  providerRequestId: z.string().min(1).max(64).optional(),
  outcome: z.enum([
    "COMPLETED",
    "NO_FILL",
    "INVALID_INIT_DATA",
    "APP_NOT_READY",
    "TIMEOUT",
    "SDK_UNAVAILABLE",
    "SDK_ERROR",
  ]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const session = await requireSession();
    const { claimId } = await params;
    const input = schema.parse(await request.json());
    const settings = await getMemorySettings(session.miniAppId);
    const claim = await prisma.gameRewardClaim.findFirst({
      where: {
        id: claimId,
        miniAppId: session.miniAppId,
        userId: session.userId,
        internalAdRequestId: input.requestId,
      },
    });
    if (!claim)
      return NextResponse.json(
        { error: "Claim request not found" },
        { status: 404 },
      );
    const attemptId = claim.attemptId;
    const completed = input.outcome === "COMPLETED";
    if (completed && !input.providerRequestId)
      return NextResponse.json({ error: "Ads Galaxy request_id is required" }, { status: 400 });
    const adRequest = await prisma.adsGalaxyAdRequest.findUnique({
      where: { publicReference: input.requestId },
    });
    if (!adRequest || adRequest.claimId !== claim.id)
      return NextResponse.json({ error: "Ad request mapping not found" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.gameRewardClaim.update({
        where: { id: claim.id },
        data: completed
          ? {
              status: "PENDING_VERIFICATION",
              browserCompletedAt: new Date(),
              errorCode: null,
              errorMessage: null,
            }
          : {
              status: input.outcome === "NO_FILL" ? "NO_FILL" : "FAILED",
              errorCode: input.outcome,
              errorMessage: "The ad was not completed.",
              nextRetryAt: new Date(
                Date.now() + settings.retryCooldownSeconds * 1000,
              ),
            },
      });
      await tx.adsGalaxyAdRequest.update({
        where: { id: adRequest.id },
        data: completed ? {
          providerRequestId: input.providerRequestId,
          browserStatus: "COMPLETED",
          browserCompletedAt: new Date(),
        } : {
          browserStatus: input.outcome,
          failureCode: input.outcome,
          failureMessage: "Browser ad flow was not completed",
        },
      });
      const attempt = attemptId ? await tx.memoryMatchAttempt.findUnique({
        where: { id: attemptId },
      }) : null;
      if (attempt?.status === "PAUSED" && attempt.pausedAt) {
        const pausedSeconds = Math.max(
          0,
          Math.floor((Date.now() - attempt.pausedAt.getTime()) / 1000),
        );
        await tx.memoryMatchAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "ACTIVE",
            pausedAt: null,
            pausedDurationSeconds: { increment: pausedSeconds },
            version: { increment: 1 },
          },
        });
      }
    });
    if (completed) {
      const verification = await verifyWithAdsGalaxy({
        miniAppId: claim.miniAppId,
        providerMiniAppId: adRequest.providerMiniAppId,
        providerRequestId: input.providerRequestId!,
        publicReference: adRequest.publicReference,
      });
      await prisma.adsGalaxyAdRequest.update({
        where: { id: adRequest.id },
        data: verification.status === "FAILED"
          ? { failureCode: verification.code, verificationStatus: "PENDING" }
          : verification.status === "VERIFIED" && verification.event?.event_id
            ? { providerEventId: verification.event.event_id, providerStatus: verification.event.status || "pending" }
            : {},
      });
      await reconcileSignedCallbackForRequest(adRequest.id);
    }
    return NextResponse.json({
      status: completed ? "PENDING_VERIFICATION" : input.outcome,
      message: completed
        ? "Ad completed. Reward pending verification."
        : input.outcome === "NO_FILL"
          ? "No sponsored ad is available right now. Your reward claim is saved."
          : "The ad could not be completed. Your reward claim is saved.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not record ad result" },
      { status: 400 },
    );
  }
}
