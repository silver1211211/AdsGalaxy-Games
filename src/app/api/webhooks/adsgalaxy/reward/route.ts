import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/features/wallet/encryption";
import {
  settleVerifiedAdRequest,
} from "@/lib/ads/adsgalaxy-server";
import {
  ADSGALAXY_MAX_CALLBACK_BYTES,
  ADSGALAXY_WEBHOOK_VERSION,
  callbackDigest,
  verifyAdsGalaxySignature,
} from "@/lib/ads/adsgalaxy-signature";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  id: z.string().regex(/^rwe_[A-Za-z0-9_-]{8,60}$/),
  type: z.enum(["reward.eligible", "reward.claimed"]),
  version: z.literal(ADSGALAXY_WEBHOOK_VERSION),
  created_at: z.string().datetime(),
  data: z.object({
    event_id: z.string().regex(/^rwe_[A-Za-z0-9_-]{8,60}$/),
    request_id: z.string().min(1).max(64),
    mini_app_id: z.number().int().positive(),
    external_user_reference: z.string().min(1).max(96).nullable(),
    provider: z.string().min(1).max(64),
    status: z.string().min(1).max(32),
    verification_level: z.string().min(1).max(48),
    reward_eligible: z.boolean(),
    completed_at: z.string().datetime(),
    expires_at: z.string().datetime(),
    claim_id: z.string().min(1).max(64).optional(),
    claimed_at: z.string().datetime().optional(),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.id !== value.data.event_id) {
    context.addIssue({ code: "custom", message: "Event identifiers do not match" });
  }
  if (value.type === "reward.claimed" && (!value.data.claim_id || !value.data.claimed_at)) {
    context.addIssue({ code: "custom", message: "Claim fields are required" });
  }
});

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return json({ error: "application/json required" }, 415);
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > ADSGALAXY_MAX_CALLBACK_BYTES) return json({ error: "Payload too large" }, 413);
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (rawBody.byteLength > ADSGALAXY_MAX_CALLBACK_BYTES) return json({ error: "Payload too large" }, 413);

  const timestamp = request.headers.get("x-adsgalaxy-timestamp") || "";
  const headerEventId = request.headers.get("x-adsgalaxy-event-id") || "";
  const eventType = request.headers.get("x-adsgalaxy-event") || "";
  const signatureVersion = request.headers.get("x-adsgalaxy-signature-version") || "";
  const signature = request.headers.get("x-adsgalaxy-signature") || "";
  if (signatureVersion !== "v2") return json({ error: "Unsupported signature version" }, 401);

  let untrusted: unknown;
  try {
    untrusted = JSON.parse(Buffer.from(rawBody).toString("utf8"));
  } catch {
    return json({ error: "Malformed JSON" }, 400);
  }
  const parsed = payloadSchema.safeParse(untrusted);
  if (!parsed.success) return json({ error: "Invalid callback payload" }, 400);
  const payload = parsed.data;
  if (headerEventId !== payload.id || eventType !== payload.type) {
    return json({ error: "Callback header mismatch" }, 400);
  }

  const configs = await prisma.adsGalaxyConfiguration.findMany({
    where: {
      miniAppPublicId: String(payload.data.mini_app_id),
      webhookSecretEncrypted: { not: null },
    },
  });
  const verifiedConfigs = configs.filter((config) => {
    try {
      return verifyAdsGalaxySignature({
        rawBody,
        timestamp,
        eventId: headerEventId,
        signature,
        secret: decryptSecret(config.webhookSecretEncrypted!),
      });
    } catch {
      return false;
    }
  });
  if (verifiedConfigs.length !== 1) return json({ error: "Invalid callback signature" }, 401);
  const config = verifiedConfigs[0];
  const digest = callbackDigest(rawBody);
  await prisma.adsGalaxyConfiguration.update({
    where: { miniAppId: config.miniAppId },
    data: { webhookSecretVerifiedAt: new Date(), lastErrorCode: null, lastErrorMessage: null },
  });

  const existing = await prisma.adsGalaxyCallbackEvent.findUnique({
    where: { providerEventId_eventType: { providerEventId: payload.id, eventType: payload.type } },
  });
  if (existing) {
    if (existing.payloadDigest !== digest || existing.providerRequestId !== payload.data.request_id) {
      await prisma.platformAlert.create({
        data: {
          miniAppId: config.miniAppId,
          type: "ADSGALAXY_EVENT_CONFLICT",
          severity: "CRITICAL",
          title: "Ads Galaxy event conflict",
          summary: `Signed event ${payload.id} was replayed with conflicting content.`,
        },
      });
      return json({ error: "Event conflict" }, 409);
    }
    await prisma.adsGalaxyCallbackEvent.update({
      where: { id: existing.id },
      data: { duplicateCount: { increment: 1 } },
    });
    return json({ received: true, duplicate: true }, 200);
  }

  const adRequest = await prisma.adsGalaxyAdRequest.findFirst({
    where: {
      miniAppId: config.miniAppId,
      providerMiniAppId: payload.data.mini_app_id,
      OR: [
        { providerRequestId: payload.data.request_id },
        ...(payload.data.external_user_reference
          ? [{ publicReference: payload.data.external_user_reference }]
          : []),
      ],
    },
    include: { claim: true },
  });

  if (!adRequest) {
    await prisma.$transaction([
      prisma.adsGalaxyCallbackEvent.create({
        data: {
          providerEventId: payload.id,
          eventType: payload.type,
          payloadDigest: digest,
          miniAppId: config.miniAppId,
          providerRequestId: payload.data.request_id,
          providerMiniAppId: payload.data.mini_app_id,
          providerStatus: payload.data.status,
          verificationLevel: payload.data.verification_level,
          rewardEligible: payload.data.reward_eligible,
          signatureVersion,
          deliveryTimestamp: new Date(Number(timestamp) * 1000),
          processingStatus: "UNMATCHED",
          failureCode: "AD_REQUEST_NOT_FOUND",
        },
      }),
      prisma.platformAlert.create({
        data: {
          miniAppId: config.miniAppId,
          type: "ADSGALAXY_UNMATCHED_CALLBACK",
          severity: "HIGH",
          title: "Unmatched Ads Galaxy callback",
          summary: `Signed event ${payload.id} requires reconciliation.`,
        },
      }),
    ]);
    return json({ error: "Callback accepted for reconciliation" }, 503);
  }

  const eligible = payload.type === "reward.eligible"
    && payload.data.status === "eligible"
    && payload.data.reward_eligible === true
    && ["ads_galaxy_validated", "provider_verified"].includes(payload.data.verification_level);
  await prisma.$transaction(async (tx) => {
    await tx.adsGalaxyCallbackEvent.create({
      data: {
        providerEventId: payload.id,
        eventType: payload.type,
        payloadDigest: digest,
        miniAppId: config.miniAppId,
        adRequestId: adRequest.id,
        providerRequestId: payload.data.request_id,
        providerMiniAppId: payload.data.mini_app_id,
        providerStatus: payload.data.status,
        verificationLevel: payload.data.verification_level,
        rewardEligible: payload.data.reward_eligible,
        signatureVersion,
        deliveryTimestamp: new Date(Number(timestamp) * 1000),
        processingStatus: eligible ? "VERIFIED" : "RECORDED",
        processedAt: new Date(),
      },
    });
    await tx.adsGalaxyAdRequest.update({
      where: { id: adRequest.id },
      data: {
        providerRequestId: adRequest.providerRequestId || payload.data.request_id,
        providerEventId: payload.id,
        providerStatus: payload.data.status,
        callbackReceivedAt: new Date(),
        ...(eligible ? { verificationStatus: "PROVIDER_VERIFIED", verifiedAt: new Date() } : {}),
      },
    });
    if (eligible) {
      await tx.gameRewardClaim.update({
        where: { id: adRequest.claimId },
        data: { status: "VERIFIED", providerEventId: payload.id, providerVerifiedAt: new Date() },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (eligible) {
    try {
      await settleVerifiedAdRequest(adRequest.id);
    } catch (error) {
      await prisma.adsGalaxyCallbackEvent.update({
        where: { providerEventId_eventType: { providerEventId: payload.id, eventType: payload.type } },
        data: { processingStatus: "SETTLEMENT_FAILED", failureCode: error instanceof Error ? error.message.slice(0, 64) : "SETTLEMENT_FAILED" },
      });
      return json({ error: "Temporary settlement failure" }, 503);
    }
  }
  return json({ received: true }, 200);
}
