import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin } from "@/features/profile/security";
import { encryptSecret } from "@/features/wallet/encryption";

const schema = z.object({
  miniAppPublicId: z.string().regex(/^\d{1,32}$/),
  applicationId: z.number().int().positive(),
  webhookSecret: z.string().regex(/^whsec_[A-Za-z0-9_-]{16,}$/).optional(),
  privateApiKey: z.string().regex(/^agx_priv_v1_[A-Za-z0-9_-]{16,}$/).optional(),
  enabled: z.boolean().optional(),
}).strict();

function preview(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    await requireSuperAdmin();
    const { tenantId } = await params;
    const [config, platform] = await Promise.all([
      prisma.adsGalaxyConfiguration.findUnique({ where: { miniAppId: tenantId } }),
      prisma.platformConfiguration.findUnique({ where: { id: "platform" } }),
    ]);
    if (!config) return Response.json({ error: "Tenant integration not found" }, { status: 404 });
    const base = platform?.primaryPublicUrl || process.env.NEXT_PUBLIC_APP_URL || null;
    return Response.json({
      miniAppPublicId: config.miniAppPublicId,
      applicationId: config.applicationId,
      enabled: config.enabled,
      status: config.status,
      webhookConfigured: Boolean(config.webhookSecretEncrypted),
      webhookSecretPreview: config.webhookSecretPreview,
      privateApiKeyConfigured: Boolean(config.privateApiKeyEncrypted),
      privateApiKeyPreview: config.privateApiKeyPreview,
      webhookSecretVerifiedAt: config.webhookSecretVerifiedAt,
      callbackUrl: base ? `${base.replace(/\/+$/, "")}/api/webhooks/adsgalaxy/reward` : null,
    });
  } catch (error) {
    return error instanceof Response ? error : Response.json({ error: "Could not load Ads Galaxy integration" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireSuperAdmin();
    const { tenantId } = await params;
    const input = schema.parse(await request.json());
    const before = await prisma.adsGalaxyConfiguration.findUnique({ where: { miniAppId: tenantId } });
    if (!before) return Response.json({ error: "Tenant integration not found" }, { status: 404 });
    if (!input.webhookSecret && !before.webhookSecretEncrypted)
      return Response.json({ error: "Webhook secret is required" }, { status: 422 });
    if (!input.privateApiKey && !before.privateApiKeyEncrypted)
      return Response.json({ error: "Private API key is required" }, { status: 422 });
    const updated = await prisma.$transaction(async (tx) => {
      const config = await tx.adsGalaxyConfiguration.update({
        where: { miniAppId: tenantId },
        data: {
          miniAppPublicId: input.miniAppPublicId,
          applicationId: input.applicationId,
          enabled: input.enabled ?? before.enabled,
          status: "CONFIGURED",
          configuredById: actor.userId,
          updatedById: actor.userId,
          ...(input.webhookSecret ? {
            webhookSecretEncrypted: encryptSecret(input.webhookSecret),
            webhookSecretPreview: preview(input.webhookSecret),
            webhookSecretVersion: { increment: 1 },
            webhookSecretVerifiedAt: null,
          } : {}),
          ...(input.privateApiKey ? {
            privateApiKeyEncrypted: encryptSecret(input.privateApiKey),
            privateApiKeyPreview: preview(input.privateApiKey),
          } : {}),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: tenantId,
          actorUserId: actor.userId,
          action: input.webhookSecret ? "ADS_GALAXY_SECRET_ROTATED" : "ADS_GALAXY_CONFIGURATION_UPDATED",
          targetType: "AdsGalaxyConfiguration",
          targetId: config.id,
          before: {
            miniAppPublicId: before.miniAppPublicId,
            applicationId: before.applicationId,
            webhookConfigured: Boolean(before.webhookSecretEncrypted),
            privateApiKeyConfigured: Boolean(before.privateApiKeyEncrypted),
          },
          after: {
            miniAppPublicId: config.miniAppPublicId,
            applicationId: config.applicationId,
            webhookConfigured: Boolean(config.webhookSecretEncrypted),
            privateApiKeyConfigured: Boolean(config.privateApiKeyEncrypted),
          },
        },
      });
      return config;
    });
    return Response.json({
      configured: true,
      enabled: updated.enabled,
      webhookSecretPreview: updated.webhookSecretPreview,
      privateApiKeyPreview: updated.privateApiKeyPreview,
    });
  } catch (error) {
    return error instanceof Response ? error : Response.json({ error: "Invalid Ads Galaxy integration configuration" }, { status: 422 });
  }
}
