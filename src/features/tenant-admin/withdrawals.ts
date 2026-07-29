import { Prisma, WithdrawalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTransitionWithdrawal } from "./withdrawal-policy";
export { canTransitionWithdrawal } from "./withdrawal-policy";

export async function transitionTenantWithdrawal(input: {
  miniAppId: string;
  actorUserId: string;
  withdrawalId: string;
  status: WithdrawalStatus;
  note?: string;
  externalId?: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const withdrawal = await tx.withdrawal.findFirst({
        where: { id: input.withdrawalId, miniAppId: input.miniAppId },
      });
      if (!withdrawal) throw new Error("Withdrawal not found");
      if (withdrawal.status === input.status) return withdrawal;
      if (!canTransitionWithdrawal(withdrawal.status, input.status))
        throw new Error(
          `Cannot move ${withdrawal.status} withdrawal to ${input.status}`,
        );
      const data: Prisma.WithdrawalUpdateInput = {
        status: input.status,
        reviewNote: input.note,
        externalId: input.externalId ?? withdrawal.externalId,
      };
      if (input.status === "COMPLETED" || input.status === "REJECTED") {
        const wallet = await tx.wallet.findFirst({
          where: { id: withdrawal.walletId, miniAppId: input.miniAppId },
        });
        if (!wallet || wallet.withdrawalHoldBalance.lessThan(withdrawal.amount))
          throw new Error("Withdrawal hold balance is inconsistent");
        if (input.status === "COMPLETED") {
          const entry = await tx.walletTransaction.create({
            data: {
              miniAppId: input.miniAppId,
              userId: withdrawal.userId,
              walletId: wallet.id,
              type: "WITHDRAWAL_COMPLETED",
              status: "COMPLETED",
              amount: new Prisma.Decimal(0),
              currency: "USD",
              balanceBefore: wallet.availableBalance,
              balanceAfter: wallet.availableBalance,
              referenceId: `withdrawal-completed:${withdrawal.id}`,
              description: "Withdrawal completed",
              metadata: { withdrawalId: withdrawal.id },
              completedAt: new Date(),
            },
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              withdrawalHoldBalance: { decrement: withdrawal.amount },
              totalWithdrawn: { increment: withdrawal.amount },
            },
          });
          data.completionTransaction = { connect: { id: entry.id } };
        } else {
          const entry = await tx.walletTransaction.create({
            data: {
              miniAppId: input.miniAppId,
              userId: withdrawal.userId,
              walletId: wallet.id,
              type: "WITHDRAWAL_REVERSAL",
              status: "COMPLETED",
              amount: withdrawal.amount,
              currency: "USD",
              balanceBefore: wallet.availableBalance,
              balanceAfter: wallet.availableBalance.add(withdrawal.amount),
              referenceId: `withdrawal-reversal:${withdrawal.id}`,
              description: "Rejected withdrawal returned to available balance",
              metadata: { withdrawalId: withdrawal.id, reason: input.note },
              completedAt: new Date(),
            },
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              availableBalance: { increment: withdrawal.amount },
              withdrawalHoldBalance: { decrement: withdrawal.amount },
            },
          });
          data.reversalTransaction = { connect: { id: entry.id } };
        }
        data.processedAt = new Date();
      }
      const saved = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data,
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: input.miniAppId,
          actorUserId: input.actorUserId,
          action: `WITHDRAWAL_${input.status}`,
          targetType: "Withdrawal",
          targetId: withdrawal.id,
          before: { status: withdrawal.status },
          after: {
            status: input.status,
            note: input.note,
            externalId: input.externalId,
          },
        },
      });
      return saved;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
