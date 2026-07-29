import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import {
  decryptDestination,
  decryptSecret,
} from "@/features/wallet/encryption";
import { transitionTenantWithdrawal } from "@/features/tenant-admin/withdrawals";
import { prisma } from "@/lib/prisma";
import {
  mapProviderStatus,
  OXAPAY_API_BASE,
  OXAPAY_CATALOG_MAX_AGE_MS,
} from "./policy";
export { testOxaPayConnection } from "./verification";

type ProviderBody = {
  data?: Record<string, unknown>;
  status?: number;
  message?: string;
  error?: { type?: string; key?: string; message?: string };
};

function providerData(body: ProviderBody): Record<string, unknown> {
  return body.data ?? (body as unknown as Record<string, unknown>);
}

function trackId(body: ProviderBody) {
  const data = providerData(body);
  const value = data.track_id ?? data.trackId;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function statusValue(body: ProviderBody) {
  const data = providerData(body);
  return data.status ?? data.payout_status ?? body.status;
}

export async function submitAutomaticWithdrawal(
  withdrawalId: string,
  fetcher: typeof fetch = fetch,
) {
  const withdrawal = await prisma.withdrawal.findUniqueOrThrow({
    where: { id: withdrawalId },
    include: { payoutMethod: true },
  });
  if (withdrawal.processingMode !== "OXAPAY_AUTOMATIC") return withdrawal;
  const [credential, platform] = await Promise.all([
    prisma.tenantOxaPayCredential.findUnique({
      where: { miniAppId: withdrawal.miniAppId },
    }),
    prisma.platformIntegrationSettings.findUnique({
      where: { id: "platform" },
    }),
  ]);
  if (!credential) throw new Error("OXAPAY_NOT_CONFIGURED");
  if (platform?.oxaPayAutomaticDisabled)
    throw new Error("PLATFORM_AUTOMATIC_WITHDRAWAL_DISABLED");
  if (!withdrawal.payoutMethod.automaticEligible)
    throw new Error("OXAPAY_ASSET_UNSUPPORTED");
  const network = await prisma.oxaPayCurrencyNetwork.findUnique({
    where: { id: withdrawal.payoutMethod.catalogNetworkId ?? "" },
  });
  if (
    !network?.isActive ||
    Date.now() - network.synchronizedAt.getTime() >
      OXAPAY_CATALOG_MAX_AGE_MS * 2
  )
    throw new Error("OXAPAY_UNAVAILABLE");
  const amount = withdrawal.netCryptoAmount;
  if (!amount || amount.lte(0)) throw new Error("OXAPAY_ASSET_UNSUPPORTED");
  const publicAppUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (
    process.env.NODE_ENV === "production" &&
    publicAppUrl.protocol !== "https:"
  )
    throw new Error("OXAPAY_CONNECTION_FAILED");
  const requestBody = {
    address: decryptDestination(withdrawal.destinationEncrypted),
    currency: withdrawal.payoutCurrency!,
    amount: amount.toString(),
    network: withdrawal.payoutNetwork!,
    callback_url: `${publicAppUrl.origin}/api/oxapay/callback/${credential.callbackKey}`,
    ...(withdrawal.memoEncrypted
      ? { memo: decryptDestination(withdrawal.memoEncrypted) }
      : {}),
    description: `Withdrawal ${withdrawal.id}`,
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(requestBody))
    .digest("hex");
  const attempt = await prisma.oxaPayPayoutAttempt
    .create({
      data: {
        miniAppId: withdrawal.miniAppId,
        withdrawalId,
        submissionKey: `oxapay:${withdrawal.id}`,
        requestFingerprint: fingerprint,
        providerStatus: "SUBMITTING",
      },
    })
    .catch(() => null);
  if (!attempt) throw new Error("WITHDRAWAL_ALREADY_PROCESSED");
  let response: Response;
  try {
    response = await fetcher(`${OXAPAY_API_BASE}/payout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        payout_api_key: decryptSecret(credential.payoutApiKeyEncrypted),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    await prisma.$transaction([
      prisma.oxaPayPayoutAttempt.update({
        where: { id: attempt.id },
        data: {
          providerStatus: "UNKNOWN",
          failureCode: "OXAPAY_PAYOUT_STATUS_UNKNOWN",
          lastCheckedAt: new Date(),
        },
      }),
      prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { providerStatus: "UNKNOWN", status: "PROCESSING" },
      }),
    ]);
    throw new Error("OXAPAY_PAYOUT_STATUS_UNKNOWN");
  }
  const body = (await response.json().catch(() => ({}))) as ProviderBody;
  if (!response.ok || (body.status && body.status >= 400)) {
    const insufficient = /insufficient/i.test(
      `${body.message ?? ""} ${body.error?.message ?? ""}`,
    );
    await prisma.oxaPayPayoutAttempt.update({
      where: { id: attempt.id },
      data: {
        providerStatus: insufficient ? "REJECTED" : "UNKNOWN",
        failureCode: insufficient
          ? "OXAPAY_INSUFFICIENT_BALANCE"
          : "OXAPAY_PAYOUT_REJECTED",
        lastCheckedAt: new Date(),
      },
    });
    if (insufficient)
      await applyProviderStatus(
        withdrawal.miniAppId,
        withdrawal.id,
        credential.configuredByUserId,
        "REJECTED",
        null,
      );
    throw new Error(
      insufficient ? "OXAPAY_INSUFFICIENT_BALANCE" : "OXAPAY_PAYOUT_REJECTED",
    );
  }
  const providerTrackId = trackId(body);
  if (!providerTrackId) {
    await prisma.oxaPayPayoutAttempt.update({
      where: { id: attempt.id },
      data: {
        providerStatus: "UNKNOWN",
        failureCode: "OXAPAY_PAYOUT_STATUS_UNKNOWN",
        lastCheckedAt: new Date(),
      },
    });
    throw new Error("OXAPAY_PAYOUT_STATUS_UNKNOWN");
  }
  const providerStatus = mapProviderStatus(statusValue(body));
  await prisma.$transaction([
    prisma.oxaPayPayoutAttempt.update({
      where: { id: attempt.id },
      data: {
        trackId: providerTrackId,
        providerStatus,
        submittedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    }),
    prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        externalId: providerTrackId,
        providerStatus,
        status: "PROCESSING",
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        miniAppId: withdrawal.miniAppId,
        actorUserId: credential.configuredByUserId,
        action: "OXAPAY_PAYOUT_SUBMITTED",
        targetType: "Withdrawal",
        targetId: withdrawal.id,
        metadata: { trackId: providerTrackId, providerStatus },
      },
    }),
  ]);
  return { trackId: providerTrackId, providerStatus };
}

export async function applyProviderStatus(
  miniAppId: string,
  withdrawalId: string,
  actorUserId: string,
  providerStatus: ReturnType<typeof mapProviderStatus>,
  track: string | null,
) {
  const withdrawal = await prisma.withdrawal.findFirst({
    where: { id: withdrawalId, miniAppId },
    include: { oxaPayAttempt: true },
  });
  if (!withdrawal?.oxaPayAttempt) throw new Error("OXAPAY_TRACK_ID_CONFLICT");
  if (track && withdrawal.oxaPayAttempt.trackId !== track)
    throw new Error("OXAPAY_TRACK_ID_CONFLICT");
  if (withdrawal.status === "COMPLETED" || withdrawal.status === "REJECTED")
    return withdrawal;
  await prisma.oxaPayPayoutAttempt.update({
    where: { id: withdrawal.oxaPayAttempt.id },
    data: {
      providerStatus,
      lastCheckedAt: new Date(),
      finalizedAt: ["CONFIRMED", "REJECTED", "CANCELED"].includes(
        providerStatus,
      )
        ? new Date()
        : undefined,
    },
  });
  await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { providerStatus },
  });
  if (providerStatus === "CONFIRMED")
    return transitionTenantWithdrawal({
      miniAppId,
      actorUserId,
      withdrawalId,
      status: "COMPLETED",
      externalId: track ?? withdrawal.externalId ?? undefined,
    });
  if (providerStatus === "REJECTED" || providerStatus === "CANCELED")
    return transitionTenantWithdrawal({
      miniAppId,
      actorUserId,
      withdrawalId,
      status: "REJECTED",
      note: "Provider rejected or canceled the payout; held funds were returned.",
      externalId: track ?? withdrawal.externalId ?? undefined,
    });
  return prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { status: "PROCESSING" },
  });
}

export async function reconcileOxaPayWithdrawal(
  miniAppId: string,
  withdrawalId: string,
  fetcher: typeof fetch = fetch,
) {
  const withdrawal = await prisma.withdrawal.findFirst({
    where: { id: withdrawalId, miniAppId },
    include: { oxaPayAttempt: true },
  });
  const credential = await prisma.tenantOxaPayCredential.findUnique({
    where: { miniAppId },
  });
  if (!withdrawal?.oxaPayAttempt?.trackId || !credential)
    throw new Error("OXAPAY_NOT_CONFIGURED");
  const response = await fetcher(
    `${OXAPAY_API_BASE}/payout/${encodeURIComponent(withdrawal.oxaPayAttempt.trackId)}`,
    {
      headers: {
        payout_api_key: decryptSecret(credential.payoutApiKeyEncrypted),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error("OXAPAY_CONNECTION_FAILED");
  const body = (await response.json()) as ProviderBody;
  return applyProviderStatus(
    miniAppId,
    withdrawalId,
    credential.configuredByUserId,
    mapProviderStatus(statusValue(body)),
    withdrawal.oxaPayAttempt.trackId,
  );
}
