import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
export async function POST() {
  try {
    const a = await requireAdmin();
    const wallets = await prisma.wallet.findMany({
        where: { miniAppId: a.miniAppId },
      }),
      issues = [] as Array<Record<string, string>>;
    for (const wallet of wallets) {
      const [ledger, holds, points, user] = await Promise.all([
        prisma.walletTransaction.aggregate({
          where: { walletId: wallet.id, status: "COMPLETED" },
          _sum: { amount: true },
        }),
        prisma.withdrawal.aggregate({
          where: {
            walletId: wallet.id,
            status: {
              in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"],
            },
          },
          _sum: { amount: true },
        }),
        prisma.pointTransaction.aggregate({
          where: { miniAppId: a.miniAppId, userId: wallet.userId },
          _sum: { amount: true },
        }),
        prisma.user.findUniqueOrThrow({ where: { id: wallet.userId } }),
      ]);
      const ledgerBalance = ledger._sum.amount?.toFixed(6) ?? "0.000000",
        hold = holds._sum.amount?.toFixed(6) ?? "0.000000";
      if (wallet.availableBalance.toFixed(6) !== ledgerBalance)
        issues.push({
          walletId: wallet.id,
          type: "AVAILABLE_BALANCE_MISMATCH",
          stored: wallet.availableBalance.toFixed(6),
          ledger: ledgerBalance,
        });
      if (wallet.withdrawalHoldBalance.toFixed(6) !== hold)
        issues.push({
          walletId: wallet.id,
          type: "WITHDRAWAL_HOLD_MISMATCH",
          stored: wallet.withdrawalHoldBalance.toFixed(6),
          ledger: hold,
        });
      if (user.totalPoints !== (points._sum.amount ?? 0))
        issues.push({
          walletId: wallet.id,
          type: "POINT_CACHE_MISMATCH",
          stored: String(user.totalPoints),
          ledger: String(points._sum.amount ?? 0),
        });
    }
    await prisma.$transaction([
      prisma.walletSettings.upsert({
        where: { miniAppId: a.miniAppId },
        create: {
          miniAppId: a.miniAppId,
          reconciliationStatus: issues.length ? "MISMATCH" : "OK",
          lastReconciledAt: new Date(),
        },
        update: {
          reconciliationStatus: issues.length ? "MISMATCH" : "OK",
          lastReconciledAt: new Date(),
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "WALLET_RECONCILIATION_RUN",
          targetType: "MiniApp",
          targetId: a.miniAppId,
          metadata: { issueCount: issues.length },
        },
      }),
    ]);
    return NextResponse.json({
      status: issues.length ? "MISMATCH" : "OK",
      walletsChecked: wallets.length,
      issues,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not reconcile wallet" },
      { status: 400 },
    );
  }
}
