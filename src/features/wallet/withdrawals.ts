import { Prisma } from "@prisma/client";
import { submitAutomaticWithdrawal } from "@/features/oxapay/client";
import { automaticConversionPolicy } from "@/features/oxapay/policy";
import { prisma } from "@/lib/prisma";
import { encryptDestination } from "./encryption";
import { maskDestination, withdrawalFee } from "./money";
export async function createWithdrawal(input: {
  miniAppId: string;
  userId: string;
  payoutMethodId: string;
  amount: string;
  destination: string;
  memo?: string;
  idempotencyKey: string;
}) {
  const withdrawal = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.withdrawal.findUnique({
        where: {
          miniAppId_userId_idempotencyKey: {
            miniAppId: input.miniAppId,
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return existing;
      const [settings, method, wallet] = await Promise.all([
        tx.walletSettings.findUniqueOrThrow({
          where: { miniAppId: input.miniAppId },
        }),
        tx.walletPayoutMethod.findFirst({
          where: {
            id: input.payoutMethodId,
            miniAppId: input.miniAppId,
            enabled: true,
            archivedAt: null,
          },
          include: { catalogNetwork: { include: { currency: true } } },
        }),
        tx.wallet.findUniqueOrThrow({
          where: {
            miniAppId_userId: {
              miniAppId: input.miniAppId,
              userId: input.userId,
            },
          },
        }),
      ]);
      if (!settings.withdrawalsEnabled || settings.emergencyDisabled)
        throw new Error("Withdrawals are unavailable");
      if (!method) throw new Error("Payout method is unavailable");
      if (
        !method.catalogNetwork ||
        !method.catalogNetwork.isActive ||
        !method.catalogNetwork.currency.isActive
      )
        throw new Error("OXAPAY_ASSET_DISABLED");
      if (settings.withdrawalProcessingMode === "OXAPAY_AUTOMATIC") {
        const [credential, platform] = await Promise.all([
          tx.tenantOxaPayCredential.findUnique({
            where: { miniAppId: input.miniAppId },
          }),
          tx.platformIntegrationSettings.findUnique({
            where: { id: "platform" },
          }),
        ]);
        if (!credential) throw new Error("OXAPAY_NOT_CONFIGURED");
        if (platform?.oxaPayAutomaticDisabled)
          throw new Error("PLATFORM_AUTOMATIC_WITHDRAWAL_DISABLED");
        if (!method.automaticEligible)
          throw new Error("OXAPAY_ASSET_UNSUPPORTED");
      }
      const amount = new Prisma.Decimal(input.amount);
      if (
        !amount.isFinite() ||
        amount.lte(0) ||
        amount.lt(settings.minimumWithdrawal) ||
        amount.gt(settings.maximumWithdrawal) ||
        amount.lt(method.minimumAmount) ||
        amount.gt(method.maximumAmount)
      )
        throw new Error("Withdrawal amount is outside the configured limits");
      if (wallet.availableBalance.lt(amount))
        throw new Error("Insufficient available balance");
      if (
        method.validationPattern &&
        !new RegExp(method.validationPattern).test(input.destination)
      )
        throw new Error("Invalid payout destination");
      const fee = withdrawalFee(amount, method.fixedFee, method.feeBasisPoints);
      if (fee.gte(amount)) throw new Error("Withdrawal fee exceeds amount");
      const id = crypto.randomUUID(),
        balanceAfter = wallet.availableBalance.sub(amount);
      const hold = await tx.walletTransaction.create({
        data: {
          miniAppId: input.miniAppId,
          userId: input.userId,
          walletId: wallet.id,
          type: "WITHDRAWAL_HOLD",
          status: "COMPLETED",
          amount: amount.neg(),
          balanceBefore: wallet.availableBalance,
          balanceAfter,
          referenceId: `withdrawal:${id}:hold`,
          description: "Withdrawal Hold",
          completedAt: new Date(),
          metadata: { payoutMethod: method.code },
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          withdrawalHoldBalance: { increment: amount },
        },
      });
      const conversion = automaticConversionPolicy(
        method.catalogNetwork.currency.symbol,
      );
      const grossCryptoAmount = conversion.eligible ? amount.sub(fee) : null;
      const providerFee = method.catalogNetwork.withdrawalFee;
      const netCryptoAmount = grossCryptoAmount
        ? Prisma.Decimal.max(grossCryptoAmount.sub(providerFee), 0)
        : null;
      if (
        settings.withdrawalProcessingMode === "OXAPAY_AUTOMATIC" &&
        grossCryptoAmount &&
        grossCryptoAmount.lt(method.catalogNetwork.withdrawalMinimum)
      )
        throw new Error("OXAPAY_PROVIDER_MINIMUM");
      return tx.withdrawal.create({
        data: {
          id,
          miniAppId: input.miniAppId,
          userId: input.userId,
          walletId: wallet.id,
          payoutMethodId: method.id,
          idempotencyKey: input.idempotencyKey,
          amount,
          fee,
          netAmount: amount.sub(fee),
          destinationEncrypted: encryptDestination(input.destination),
          destinationMasked: maskDestination(input.destination),
          memoEncrypted: input.memo
            ? encryptDestination(input.memo.trim())
            : null,
          processingMode: settings.withdrawalProcessingMode,
          payoutCurrency: method.currencySymbol,
          payoutNetwork: method.networkCode,
          requestedWalletValue: amount,
          pricingSource: conversion.source,
          quotedExchangeRate: conversion.rate
            ? new Prisma.Decimal(conversion.rate)
            : null,
          quoteTimestamp: conversion.rate ? new Date() : null,
          grossCryptoAmount,
          providerFee,
          platformFee: fee,
          netCryptoAmount,
          holdTransactionId: hold.id,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (withdrawal.processingMode === "OXAPAY_AUTOMATIC") {
    await submitAutomaticWithdrawal(withdrawal.id);
    return prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
  }
  return withdrawal;
}
export async function cancelWithdrawal(
  miniAppId: string,
  userId: string,
  id: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const withdrawal = await tx.withdrawal.findFirst({
        where: { id, miniAppId, userId },
        include: { wallet: true },
      });
      if (!withdrawal) throw new Error("Withdrawal not found");
      if (withdrawal.status === "CANCELLED") return withdrawal;
      if (withdrawal.status !== "PENDING")
        throw new Error("Withdrawal can no longer be cancelled");
      const settings = await tx.walletSettings.findUniqueOrThrow({
        where: { miniAppId },
      });
      if (
        Date.now() - withdrawal.createdAt.getTime() >
        settings.cancellationMinutes * 60000
      )
        throw new Error("Cancellation window has closed");
      const balanceAfter = withdrawal.wallet.availableBalance.add(
        withdrawal.amount,
      );
      const reversal = await tx.walletTransaction.create({
        data: {
          miniAppId,
          userId,
          walletId: withdrawal.walletId,
          type: "WITHDRAWAL_REVERSAL",
          status: "COMPLETED",
          amount: withdrawal.amount,
          balanceBefore: withdrawal.wallet.availableBalance,
          balanceAfter,
          referenceId: `withdrawal:${id}:reversal`,
          description: "Withdrawal Cancellation",
          completedAt: new Date(),
        },
      });
      await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          availableBalance: balanceAfter,
          withdrawalHoldBalance: { decrement: withdrawal.amount },
        },
      });
      return tx.withdrawal.update({
        where: { id },
        data: {
          status: "CANCELLED",
          reversalTransactionId: reversal.id,
          processedAt: new Date(),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
