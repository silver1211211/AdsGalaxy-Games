import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
const schema = z
  .object({
    userId: z.string(),
    kind: z.enum([
      "WALLET_CREDIT",
      "WALLET_DEBIT",
      "POINT_CREDIT",
      "POINT_DEBIT",
    ]),
    amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
    reason: z.string().trim().min(10).max(500),
    idempotencyKey: z.string().uuid(),
    confirmed: z.literal(true),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const a = await requireAdmin(),
      i = schema.parse(await request.json());
    if (
      !(await prisma.miniAppMembership.count({
        where: { miniAppId: a.miniAppId, userId: i.userId, status: "ACTIVE" },
      }))
    )
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    const result = await prisma.$transaction(
      async (tx) => {
        const prior = await tx.walletAdjustment.findUnique({
          where: {
            miniAppId_idempotencyKey: {
              miniAppId: a.miniAppId,
              idempotencyKey: i.idempotencyKey,
            },
          },
        });
        if (prior) return prior;
        const id = crypto.randomUUID(),
          walletKind = i.kind.startsWith("WALLET"),
          credit = i.kind.endsWith("CREDIT");
        let walletTransactionId: string | undefined,
          pointTransactionId: string | undefined;
        if (walletKind) {
          const wallet = await tx.wallet.findUniqueOrThrow({
              where: {
                miniAppId_userId: { miniAppId: a.miniAppId, userId: i.userId },
              },
            }),
            amount = new Prisma.Decimal(i.amount).mul(credit ? 1 : -1),
            after = wallet.availableBalance.add(amount);
          if (after.lt(0))
            throw new Error("Adjustment would create a negative balance");
          const t = await tx.walletTransaction.create({
            data: {
              miniAppId: a.miniAppId,
              userId: i.userId,
              walletId: wallet.id,
              type: credit ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
              status: "COMPLETED",
              amount,
              balanceBefore: wallet.availableBalance,
              balanceAfter: after,
              referenceId: `admin-wallet-adjustment:${id}`,
              description: i.reason,
              completedAt: new Date(),
            },
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { availableBalance: after },
          });
          walletTransactionId = t.id;
        } else {
          const user = await tx.user.findUniqueOrThrow({
              where: { id: i.userId },
            }),
            amount = Math.trunc(Number(i.amount)) * (credit ? 1 : -1),
            after = user.totalPoints + amount;
          if (after < 0)
            throw new Error("Adjustment would create negative points");
          const t = await tx.pointTransaction.create({
            data: {
              miniAppId: a.miniAppId,
              userId: i.userId,
              amount,
              balanceAfter: after,
              type: credit ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
              referenceId: `admin-point-adjustment:${id}`,
              description: i.reason,
            },
          });
          await tx.user.update({
            where: { id: i.userId },
            data: { totalPoints: after },
          });
          pointTransactionId = t.id;
        }
        const adjustment = await tx.walletAdjustment.create({
          data: {
            id,
            miniAppId: a.miniAppId,
            userId: i.userId,
            actorUserId: a.userId,
            idempotencyKey: i.idempotencyKey,
            kind: i.kind,
            walletAmount: walletKind
              ? new Prisma.Decimal(i.amount).mul(credit ? 1 : -1)
              : null,
            pointsAmount: walletKind
              ? null
              : Math.trunc(Number(i.amount)) * (credit ? 1 : -1),
            reason: i.reason,
            walletTransactionId,
            pointTransactionId,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "WALLET_ADJUSTMENT_CREATED",
            targetType: "WalletAdjustment",
            targetId: adjustment.id,
            metadata: {
              kind: i.kind,
              reason: i.reason,
              targetUserId: i.userId,
            },
          },
        });
        return adjustment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ id: result.id, kind: result.kind });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create adjustment" },
      { status: 422 },
    );
  }
}
