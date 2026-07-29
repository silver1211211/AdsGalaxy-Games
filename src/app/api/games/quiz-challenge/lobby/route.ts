import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getQuizSettings } from "@/features/quiz/server";

export async function GET() {
  try {
    const session = await requireSession();
    const settings = await getQuizSettings(session.miniAppId);
    const [wallet, points, sessions, categories, active, daily] =
      await Promise.all([
        prisma.wallet.findUnique({
          where: {
            miniAppId_userId: {
              miniAppId: session.miniAppId,
              userId: session.userId,
            },
          },
        }),
        prisma.pointTransaction.aggregate({
          where: { miniAppId: session.miniAppId, userId: session.userId },
          _sum: { amount: true },
        }),
        prisma.quizSession.findMany({
          where: {
            miniAppId: session.miniAppId,
            userId: session.userId,
            status: "COMPLETED",
          },
          select: {
            finalPoints: true,
            correctCount: true,
            incorrectCount: true,
            timeoutCount: true,
            bestStreak: true,
          },
        }),
        prisma.quizCategory.findMany({
          where: {
            enabled: true,
            ownerMiniAppId: null,
            OR: [
              { miniApps: { none: { miniAppId: session.miniAppId } } },
              {
                miniApps: {
                  some: { miniAppId: session.miniAppId, enabled: true },
                },
              },
            ],
          },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.quizSession.findFirst({
          where: {
            miniAppId: session.miniAppId,
            userId: session.userId,
            status: { in: ["ACTIVE", "PAUSED", "AD_BREAK"] },
            expiresAt: { gt: new Date() },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.quizDailyChallenge.findUnique({
          where: {
            miniAppId_userId_periodKey: {
              miniAppId: session.miniAppId,
              userId: session.userId,
              periodKey: new Date().toISOString().slice(0, 10),
            },
          },
        }),
      ]);
    const answered = sessions.reduce(
      (sum, item) =>
        sum + item.correctCount + item.incorrectCount + item.timeoutCount,
      0,
    );
    const correct = sessions.reduce((sum, item) => sum + item.correctCount, 0);
    return NextResponse.json(
      {
        enabled: settings.enabled,
        stats: {
          points: points._sum.amount ?? 0,
          wallet: wallet?.availableBalance.toFixed(2) ?? "0.00",
          highScore: sessions.reduce(
            (max, item) => Math.max(max, item.finalPoints),
            0,
          ),
          completed: sessions.length,
          accuracyBps: Math.round((correct * 10000) / Math.max(1, answered)),
          bestStreak: sessions.reduce(
            (max, item) => Math.max(max, item.bestStreak),
            0,
          ),
        },
        modes: {
          QUICK: settings.quickEnabled,
          CLASSIC: settings.classicEnabled,
          CATEGORY: settings.categoryEnabled,
          DAILY: settings.dailyEnabled,
        },
        categories: categories.map(({ id, name, slug, icon, description }) => ({
          id,
          name,
          slug,
          icon,
          description,
        })),
        activeSession: active
          ? {
              id: active.id,
              mode: active.mode,
              position: active.currentPosition,
            }
          : null,
        daily: {
          started: Boolean(daily),
          completed: Boolean(daily?.firstCompletedAt),
          bestScore: daily?.bestScore ?? 0,
        },
        reward: {
          scheduledWalletEnabled: settings.scheduledWalletEnabled,
          amount: settings.scheduledWalletAmount.toFixed(2),
          verification: "PENDING_PROVIDER_VERIFICATION",
        },
        settings: {
          sponsoredLobbyEnabled: settings.sponsoredLobbyEnabled,
          soundDefault: settings.soundDefault,
          quickCount: settings.quickQuestionCount,
          classicCount: settings.classicQuestionCount,
          categoryCount: settings.categoryQuestionCount,
          dailyCount: settings.dailyQuestionCount,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load Quiz Challenge" },
      { status: 400 },
    );
  }
}
