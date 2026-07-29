import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getWalletSettings } from "@/features/wallet/server";
export async function GET() {
  try {
    const auth = await requireSession();
    const [
      wallet,
      settings,
      pending,
      credited,
      withdrawals,
      points,
      walletTx,
      pointTx,
    ] = await Promise.all([
      prisma.wallet.findUnique({
        where: {
          miniAppId_userId: { miniAppId: auth.miniAppId, userId: auth.userId },
        },
      }),
      getWalletSettings(auth.miniAppId),
      prisma.gameRewardClaim.aggregate({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          rewardType: { in: ["MONEY", "WALLET"] },
          status: {
            in: [
              "MATCHED",
              "AD_REQUESTED",
              "BROWSER_COMPLETED",
              "PENDING_VERIFICATION",
              "VERIFIED",
            ],
          },
        },
        _sum: { configuredMoneyAmount: true },
        _count: true,
      }),
      prisma.gameRewardClaim.count({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: "CREDITED",
          rewardType: { in: ["MONEY", "WALLET"] },
        },
      }),
      prisma.withdrawal.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        include: { payoutMethod: { select: { name: true, code: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.pointTransaction.aggregate({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
      }),
      prisma.pointTransaction.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
      }),
    ]);
    return NextResponse.json(
      {
        currency: "USD",
        availableBalance: wallet?.availableBalance.toFixed(6) ?? "0.000000",
        pendingRewardBalance: (
          pending._sum.configuredMoneyAmount ?? 0
        ).toString(),
        withdrawalHoldBalance:
          wallet?.withdrawalHoldBalance.toFixed(6) ?? "0.000000",
        lifetimeEarnings: wallet?.lifetimeEarnings.toFixed(6) ?? "0.000000",
        totalWithdrawn: wallet?.totalWithdrawn.toFixed(6) ?? "0.000000",
        totalPoints: points._sum.amount ?? 0,
        pendingRewardCount: pending._count,
        completedRewardCount: credited,
        activeWithdrawalCount: withdrawals.filter((w) =>
          ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(
            w.status,
          ),
        ).length,
        pointConversionEnabled:
          settings.conversionEnabled &&
          !settings.conversionEmergencyDisabled &&
          !settings.emergencyDisabled,
        withdrawalsEnabled:
          settings.withdrawalsEnabled && !settings.emergencyDisabled,
        minimumWithdrawal: settings.minimumWithdrawal.toFixed(6),
        maximumWithdrawal: settings.maximumWithdrawal.toFixed(6),
        withdrawalProcessingMode: settings.withdrawalProcessingMode,
        pointsPerDollar: settings.pointsPerDollar,
        minimumConversionPoints: settings.minimumConversionPoints,
        maximumConversionPointsRequest: settings.maximumConversionPointsRequest,
        maximumConversionPointsDay: settings.maximumConversionPointsDay,
        recentTransactions: walletTx.map((t) => ({
          ...t,
          amount: t.amount.toFixed(6),
          balanceBefore: t.balanceBefore?.toFixed(6),
          balanceAfter: t.balanceAfter?.toFixed(6),
        })),
        recentPointTransactions: pointTx,
        recentWithdrawals: withdrawals.map(
          ({ destinationEncrypted, memoEncrypted, ...w }) => ({
            ...w,
            amount: w.amount.toFixed(6),
            fee: w.fee.toFixed(6),
            netAmount: w.netAmount.toFixed(6),
          }),
        ),
        updatedAt: wallet?.updatedAt ?? new Date(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load wallet" },
      { status: 400 },
    );
  }
}
