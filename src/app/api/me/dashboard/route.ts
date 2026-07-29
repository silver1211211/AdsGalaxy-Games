import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [wallet, points, completedGames, highScore, progress, adConfig, platformIntegrations] =
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
      prisma.memoryMatchAttempt.count({
        where: {
          miniAppId: session.miniAppId,
          userId: session.userId,
          status: "COMPLETED",
        },
      }),
      prisma.memoryMatchAttempt.aggregate({
        where: {
          miniAppId: session.miniAppId,
          userId: session.userId,
          status: "COMPLETED",
        },
        _max: { finalPoints: true },
      }),
      prisma.memoryMatchAttempt.aggregate({
        where: {
          miniAppId: session.miniAppId,
          userId: session.userId,
          status: "COMPLETED",
        },
        _max: { level: true, stars: true },
      }),
      prisma.adsGalaxyConfiguration.findUnique({
        where: { miniAppId: session.miniAppId },
      }),
      prisma.platformIntegrationSettings.findUnique({where:{id:"platform"}}),
    ]);
  return NextResponse.json(
    {
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        username: session.user.username,
        avatar: session.user.avatar,
      },
      role: session.role,
      points: points._sum.amount ?? 0,
      wallet: {
        available: wallet?.availableBalance.toFixed(2) ?? "0.00",
        pending: wallet?.pendingBalance.toFixed(2) ?? "0.00",
        lifetime: wallet?.lifetimeEarnings.toFixed(2) ?? "0.00",
      },
      completedGames,
      highScore: highScore._max.finalPoints ?? 0,
      unlockedLevels: Math.min(15, (progress._max.level ?? 0) + 1),
      bestStars: progress._max.stars ?? 0,
      ads: {
        configured: Boolean(!platformIntegrations?.adsGalaxyEmergencyDisabled && adConfig?.enabled && adConfig.miniAppPublicId),
        miniAppId: !platformIntegrations?.adsGalaxyEmergencyDisabled && adConfig?.enabled ? adConfig.miniAppPublicId : null,
        environment: adConfig?.environment ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
