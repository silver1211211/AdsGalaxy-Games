import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import {
  saveOxaPayCredential,
  publicIntegrationSettings,
} from "@/features/oxapay/admin";
import { testOxaPayConnection } from "@/features/oxapay/client";
import { catalogForTenant } from "@/features/oxapay/catalog";
import { assertWalletEncryptionConfigured } from "@/features/wallet/encryption";
import { prisma } from "@/lib/prisma";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";

const keySchema = z
  .object({
    apiKey: z.string().trim().min(16).max(300),
    confirm: z.literal(true),
  })
  .strict();
const modeSchema = z
  .object({
    mode: z.enum(["MANUAL", "OXAPAY_AUTOMATIC"]),
    confirm: z.literal(true),
  })
  .strict();

const connectErrors: Record<string, { status: number; message: string }> = {
  INVALID_INPUT: {
    status: 422,
    message: "Enter a valid OxaPay Payout API key.",
  },
  CONFIRMATION_REQUIRED: {
    status: 422,
    message: "Confirm that this is an OxaPay Payout API key.",
  },
  UNAUTHENTICATED: {
    status: 401,
    message: "Sign in before connecting OxaPay.",
  },
  FORBIDDEN: {
    status: 403,
    message: "An active tenant Admin session is required.",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Too many connection attempts. Please try again later.",
  },
  WALLET_ENCRYPTION_NOT_CONFIGURED: {
    status: 500,
    message: "Secure Wallet encryption is not configured on this installation.",
  },
  OXAPAY_INVALID_API_KEY: {
    status: 422,
    message:
      "This Payout API key could not be verified. Confirm that it was created in OxaPay Payout Service, not Merchant Service.",
  },
  OXAPAY_WRONG_API_KEY_TYPE: {
    status: 422,
    message:
      "This appears to be the wrong key type. Use a Payout API key, not a Merchant API key.",
  },
  OXAPAY_TIMEOUT: {
    status: 504,
    message:
      "OxaPay did not respond in time. Nothing was saved. Please try again.",
  },
  OXAPAY_UNAVAILABLE: {
    status: 503,
    message: "OxaPay is temporarily unavailable. Nothing was saved.",
  },
  OXAPAY_RATE_LIMITED: {
    status: 429,
    message: "OxaPay rate-limited the connection check. Please try again later.",
  },
  OXAPAY_UNEXPECTED_RESPONSE: {
    status: 502,
    message: "OxaPay returned an unexpected response. Nothing was saved.",
  },
};

function connectFailure(code: string) {
  const failure = connectErrors[code] ?? {
    status: 500,
    message: "Unable to connect OxaPay. Please try again.",
  };
  return Response.json(
    { ok: false, error: { code, message: failure.message } },
    { status: failure.status },
  );
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const auth = await requireTenantAdmin((await params).tenantSlug);
    const [credential, settings, platform, catalog] = await Promise.all([
      prisma.tenantOxaPayCredential.findUnique({
        where: { miniAppId: auth.miniAppId },
      }),
      prisma.walletSettings.findUniqueOrThrow({
        where: { miniAppId: auth.miniAppId },
      }),
      publicIntegrationSettings(),
      catalogForTenant(auth.miniAppId),
    ]);
    return Response.json({
      mode: settings.withdrawalProcessingMode,
      credential: credential
        ? {
            configured: true,
            masked: credential.payoutApiKeyMasked,
            configuredAt: credential.configuredAt,
            lastSuccessfulVerification: credential.lastSuccessfulVerification,
            lastFailedVerification: credential.lastFailedVerification,
          }
        : { configured: false },
      platform,
      catalog,
    });
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json(
          { error: "Could not load OxaPay settings." },
          { status: 500 },
        );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId });
    rateLimit(`oxapay-key:${auth.userId}`, 3, 60_000);
    const input = keySchema.parse(await request.json());
    assertWalletEncryptionConfigured();
    await testOxaPayConnection(input.apiKey);
    const connection = await saveOxaPayCredential({
        miniAppId: auth.miniAppId,
        actorUserId: auth.userId,
        apiKey: input.apiKey,
      });
    return Response.json({ ok: true, connection });
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 401) return connectFailure("UNAUTHENTICATED");
      if (error.status === 403) {
        const body = await error.clone().json().catch(() => null);
        if (body?.error?.code === "RECENT_AUTH_REQUIRED") return error;
        return connectFailure("FORBIDDEN");
      }
      if (error.status === 429) return connectFailure("RATE_LIMITED");
      return error;
    }
    if (error instanceof z.ZodError) {
      const confirmationMissing = error.issues.some(
        (issue) => issue.path[0] === "confirm",
      );
      return connectFailure(
        confirmationMissing ? "CONFIRMATION_REQUIRED" : "INVALID_INPUT",
      );
    }
    const code =
      error instanceof Error ? error.message : "OXAPAY_CONNECTION_FAILED";
    return connectFailure(code);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId });
    const input = modeSchema.parse(await request.json());
    if (input.mode === "OXAPAY_AUTOMATIC") {
      const [credential, assets, platform] = await Promise.all([
        prisma.tenantOxaPayCredential.findUnique({
          where: { miniAppId: auth.miniAppId },
        }),
        prisma.walletPayoutMethod.count({
          where: {
            miniAppId: auth.miniAppId,
            enabled: true,
            automaticEligible: true,
          },
        }),
        prisma.platformIntegrationSettings.findUnique({
          where: { id: "platform" },
        }),
      ]);
      if (!credential)
        return Response.json(
          { error: "Connect OxaPay first.", code: "OXAPAY_NOT_CONFIGURED" },
          { status: 422 },
        );
      if (!assets)
        return Response.json(
          {
            error: "Enable at least one automatic-eligible payout network.",
            code: "OXAPAY_ASSET_DISABLED",
          },
          { status: 422 },
        );
      if (platform?.oxaPayAutomaticDisabled)
        return Response.json(
          {
            error: "Automatic withdrawals are temporarily unavailable.",
            code: "PLATFORM_AUTOMATIC_WITHDRAWAL_DISABLED",
          },
          { status: 503 },
        );
    }
    const before = await prisma.walletSettings.findUniqueOrThrow({
      where: { miniAppId: auth.miniAppId },
    });
    await prisma.$transaction([
      prisma.walletSettings.update({
        where: { miniAppId: auth.miniAppId },
        data: {
          withdrawalProcessingMode: input.mode,
          updatedById: auth.userId,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "WITHDRAWAL_MODE_CHANGED",
          targetType: "WalletSettings",
          targetId: before.id,
          before: { mode: before.withdrawalProcessingMode },
          after: { mode: input.mode },
        },
      }),
    ]);
    return Response.json({ mode: input.mode });
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json(
          {
            error: "Invalid withdrawal mode.",
            code: "INVALID_WITHDRAWAL_MODE",
          },
          { status: 422 },
        );
  }
}
