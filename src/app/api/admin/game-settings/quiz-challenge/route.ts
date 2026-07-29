import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getQuizSettings } from "@/features/quiz/server";

const schema = z.object({
  enabled: z.boolean(),
  quickEnabled: z.boolean(),
  classicEnabled: z.boolean(),
  categoryEnabled: z.boolean(),
  dailyEnabled: z.boolean(),
  soundDefault: z.boolean(),
  explanationsEnabled: z.boolean(),
  immediateFeedback: z.boolean(),
  resultReviewEnabled: z.boolean(),
  quickQuestionCount: z.number().int().min(3).max(20),
  classicQuestionCount: z.number().int().min(5).max(30),
  categoryQuestionCount: z.number().int().min(5).max(30),
  dailyQuestionCount: z.number().int().min(5).max(30),
  easyTimeSeconds: z.number().int().min(5).max(120),
  mediumTimeSeconds: z.number().int().min(5).max(120),
  hardTimeSeconds: z.number().int().min(5).max(120),
  easyBasePoints: z.number().int().min(1).max(1000),
  mediumBasePoints: z.number().int().min(1).max(1000),
  hardBasePoints: z.number().int().min(1).max(1000),
  maxTimeBonusBps: z.number().int().min(0).max(10000),
  streakStepBps: z.number().int().min(0).max(10000),
  maxStreakBonusBps: z.number().int().min(0).max(20000),
  scheduledWalletEnabled: z.boolean(),
  scheduledWalletAmount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  fiftyFiftyEnabled: z.boolean(),
  extraTimeEnabled: z.boolean(),
  secondChanceEnabled: z.boolean(),
  doublePointsEnabled: z.boolean(),
  quickAdPosition: z.number().int().min(1).max(30),
  classicAdPosition1: z.number().int().min(1).max(30),
  classicAdPosition2: z.number().int().min(1).max(30).nullable(),
  categoryAdPosition: z.number().int().min(1).max(30),
  dailyAdPosition: z.number().int().min(1).max(30),
  minSessionBeforeAdSeconds: z.number().int().min(0).max(3600),
  minAdIntervalSeconds: z.number().int().min(0).max(3600),
  maxScheduledAdsSession: z.number().int().min(0).max(3),
  sponsoredLobbyEnabled: z.boolean(),
  emergencyDisabled: z.boolean(),
});
function output(settings: Awaited<ReturnType<typeof getQuizSettings>>) {
  return {
    ...settings,
    scheduledWalletAmount: settings.scheduledWalletAmount.toFixed(2),
    dailyWalletUserCap: settings.dailyWalletUserCap.toFixed(2),
    dailyWalletMiniAppCap: settings.dailyWalletMiniAppCap.toFixed(2),
    pendingLiabilityCap: settings.pendingLiabilityCap.toFixed(2),
  };
}
export async function GET() {
  try {
    const auth = await requireAdmin();
    return NextResponse.json(output(await getQuizSettings(auth.miniAppId)));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load Quiz settings" },
      { status: 400 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    const input = schema.parse(await request.json());
    const before = await getQuizSettings(auth.miniAppId);
    const settings = await prisma.$transaction(async (tx) => {
      const saved = await tx.quizSettings.update({
        where: { miniAppId: auth.miniAppId },
        data: {
          ...input,
          scheduledWalletAmount: new Prisma.Decimal(
            input.scheduledWalletAmount,
          ),
          updatedById: auth.userId,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "QUIZ_SETTINGS_UPDATED",
          targetType: "QuizSettings",
          targetId: saved.id,
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(input)),
        },
      });
      return saved;
    });
    return NextResponse.json(output(settings));
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid Quiz settings", issues: error.issues },
        { status: 422 },
      );
    return NextResponse.json(
      { error: "Could not save Quiz settings" },
      { status: 400 },
    );
  }
}
