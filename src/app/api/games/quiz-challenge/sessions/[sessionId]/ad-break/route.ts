import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getQuizSettings, serializeQuizSession } from "@/features/quiz/server";

const schema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("REQUEST") }),
  z.object({
    phase: z.literal("RESULT"),
    requestId: z.string().uuid(),
    outcome: z.enum([
      "COMPLETED",
      "NO_FILL",
      "INVALID_INIT_DATA",
      "APP_NOT_READY",
      "TIMEOUT",
      "SDK_UNAVAILABLE",
      "SDK_ERROR",
    ]),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession();
    const { sessionId } = await params;
    const input = schema.parse(await request.json());
    const session = await prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        status: "AD_BREAK",
      },
    });
    if (!session)
      return NextResponse.json(
        { error: "No scheduled break is due" },
        { status: 409 },
      );
    const [settings, ads] = await Promise.all([
      getQuizSettings(auth.miniAppId),
      prisma.adsGalaxyConfiguration.findUnique({
        where: { miniAppId: auth.miniAppId },
      }),
    ]);
    const position = session.currentPosition - 1;
    if (input.phase === "REQUEST") {
      if (
        !settings.scheduledWalletEnabled ||
        settings.emergencyDisabled ||
        !ads?.enabled ||
        !ads.miniAppPublicId
      )
        return NextResponse.json(
          { error: "Sponsored rewards are currently unavailable" },
          { status: 503 },
        );
      let claim = await prisma.gameRewardClaim.findFirst({
        where: {
          quizSessionId: session.id,
          questionPosition: position,
          claimContext: "SCHEDULED_BREAK",
        },
      });
      if (!claim)
        claim = await prisma.gameRewardClaim.create({
          data: {
            miniAppId: auth.miniAppId,
            userId: auth.userId,
            attemptId: null,
            gameKey: "quiz-challenge",
            quizSessionId: session.id,
            questionPosition: position,
            claimContext: "SCHEDULED_BREAK",
            level: 0,
            pairSlot: position,
            rewardType: "WALLET",
            configuredMoneyAmount: settings.scheduledWalletAmount,
            expiresAt: new Date(
              Date.now() + settings.pendingExpiryMinutes * 60_000,
            ),
          },
        });
      if (claim.nextRetryAt && claim.nextRetryAt > new Date())
        return NextResponse.json(
          { error: "Ad retry cooldown is active" },
          { status: 429 },
        );
      if (claim.retryCount >= settings.maxRetryAttempts)
        return NextResponse.json(
          { error: "Maximum retries reached" },
          { status: 429 },
        );
      return NextResponse.json({
        claimId: claim.id,
        amount: settings.scheduledWalletAmount.toFixed(2),
        environment: ads.environment,
      });
    }
    const claim = await prisma.gameRewardClaim.findFirst({
      where: {
        quizSessionId: session.id,
        internalAdRequestId: input.requestId,
      },
    });
    if (!claim)
      return NextResponse.json(
        { error: "Ad request not found" },
        { status: 404 },
      );
    const completed = input.outcome === "COMPLETED";
    await prisma.$transaction([
      prisma.gameRewardClaim.update({
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
              errorMessage: "Ad was not completed",
              nextRetryAt: new Date(
                Date.now() + settings.retryCooldownSeconds * 1000,
              ),
            },
      }),
      prisma.quizSession.update({
        where: { id: session.id },
        data: completed
          ? {
              scheduledAdsCompleted: { increment: 1 },
              lastAdCompletedAt: new Date(),
              version: { increment: 1 },
            }
          : {
              noFillCount: { increment: input.outcome === "NO_FILL" ? 1 : 0 },
              version: { increment: 1 },
            },
      }),
    ]);
    return NextResponse.json({
      message: completed
        ? `Sponsored ad completed. Your $${claim.configuredMoneyAmount?.toFixed(2)} reward is pending verification.`
        : input.outcome === "NO_FILL"
          ? "No sponsored ad is available right now. Continue your quiz."
          : "The sponsored ad could not be completed. Continue your quiz.",
      session: await serializeQuizSession(session.id),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not process sponsored break" },
      { status: 400 },
    );
  }
}
