import { randomBytes } from "crypto";
import { encryptSecret } from "@/features/wallet/encryption";
import { prisma } from "@/lib/prisma";
import { maskApiKey, safeSignupUrl } from "./policy";
export { requireRecentAdminSession } from "./recent-auth";

export async function saveOxaPayCredential(input: {
  miniAppId: string;
  actorUserId: string;
  apiKey: string;
}) {
  const existing = await prisma.tenantOxaPayCredential.findUnique({
    where: { miniAppId: input.miniAppId },
  });
  const saved = await prisma.$transaction(async (tx) => {
    const credential = await tx.tenantOxaPayCredential.upsert({
      where: { miniAppId: input.miniAppId },
      create: {
        miniAppId: input.miniAppId,
        payoutApiKeyEncrypted: encryptSecret(input.apiKey),
        payoutApiKeyMasked: maskApiKey(input.apiKey),
        callbackKey: randomBytes(24).toString("hex"),
        configuredByUserId: input.actorUserId,
        lastSuccessfulVerification: new Date(),
      },
      update: {
        payoutApiKeyEncrypted: encryptSecret(input.apiKey),
        payoutApiKeyMasked: maskApiKey(input.apiKey),
        configuredByUserId: input.actorUserId,
        configuredAt: new Date(),
        lastSuccessfulVerification: new Date(),
        lastFailedVerification: null,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        miniAppId: input.miniAppId,
        actorUserId: input.actorUserId,
        action: existing ? "OXAPAY_KEY_REPLACED" : "OXAPAY_KEY_CONFIGURED",
        targetType: "TenantOxaPayCredential",
        targetId: credential.id,
        metadata: { masked: credential.payoutApiKeyMasked },
      },
    });
    return credential;
  });
  return {
    status: "CONNECTED" as const,
    configured: true,
    maskedKey: saved.payoutApiKeyMasked,
    masked: saved.payoutApiKeyMasked,
    configuredAt: saved.configuredAt,
    lastVerifiedAt: saved.lastSuccessfulVerification,
    lastSuccessfulVerification: saved.lastSuccessfulVerification,
    lastFailedVerification: saved.lastFailedVerification,
  };
}

export async function publicIntegrationSettings() {
  const settings = await prisma.platformIntegrationSettings.upsert({
    where: { id: "platform" },
    create: { id: "platform" },
    update: {},
  });
  const url = settings.oxaPaySignupEnabled
    ? safeSignupUrl(settings.oxaPaySignupUrl)
    : null;
  return {
    signupUrl: url,
    signupLabel: settings.oxaPaySignupLabel,
    signupHelp:
      settings.oxaPayHelpText ??
      "Create a Payout API key inside your OxaPay Payout Service dashboard.",
    automaticAvailable: !settings.oxaPayAutomaticDisabled,
    catalogSynchronizedAt: settings.oxaPayCatalogSynchronizedAt,
  };
}
