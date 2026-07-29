import { createHash } from "crypto";
import { decryptSecret } from "@/features/wallet/encryption";
import { applyProviderStatus } from "@/features/oxapay/client";
import { mapProviderStatus } from "@/features/oxapay/policy";
import { verifyOxaPayCallback } from "@/features/oxapay/security";
import { prisma } from "@/lib/prisma";

type CallbackBody = {
  track_id?: string | number;
  status?: string;
  currency?: string;
  network?: string;
  data?: {
    track_id?: string | number;
    status?: string;
    currency?: string;
    network?: string;
  };
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callbackKey: string }> },
) {
  const { callbackKey } = await params;
  const credential = await prisma.tenantOxaPayCredential.findUnique({
    where: { callbackKey },
  });
  if (!credential) return new Response(null, { status: 404 });
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const apiKey = decryptSecret(credential.payoutApiKeyEncrypted);
  if (!verifyOxaPayCallback(rawBody, request.headers.get("HMAC"), apiKey))
    return Response.json(
      {
        error: "Invalid callback signature.",
        code: "OXAPAY_CALLBACK_INVALID_SIGNATURE",
      },
      { status: 401 },
    );
  let body: CallbackBody;
  try {
    body = JSON.parse(Buffer.from(rawBody).toString("utf8")) as CallbackBody;
  } catch {
    return Response.json({ error: "Invalid callback." }, { status: 400 });
  }
  const data = body.data ?? body;
  const trackId = data.track_id === undefined ? null : String(data.track_id);
  if (!trackId)
    return Response.json(
      { error: "Unknown payout.", code: "OXAPAY_TRACK_ID_CONFLICT" },
      { status: 409 },
    );
  const attempt = await prisma.oxaPayPayoutAttempt.findFirst({
    where: { miniAppId: credential.miniAppId, trackId },
    include: { withdrawal: true },
  });
  if (!attempt)
    return Response.json(
      { error: "Unknown payout.", code: "OXAPAY_TRACK_ID_CONFLICT" },
      { status: 409 },
    );
  if (
    (data.currency && data.currency !== attempt.withdrawal.payoutCurrency) ||
    (data.network && data.network !== attempt.withdrawal.payoutNetwork)
  )
    return Response.json(
      { error: "Payout details conflict.", code: "OXAPAY_TRACK_ID_CONFLICT" },
      { status: 409 },
    );
  const digest = createHash("sha256").update(rawBody).digest("hex");
  const digests = Array.isArray(attempt.callbackDigests)
    ? (attempt.callbackDigests as string[])
    : [];
  if (digests.includes(digest))
    return Response.json({ ok: true, replay: true });
  await prisma.oxaPayPayoutAttempt.update({
    where: { id: attempt.id },
    data: { callbackDigests: [...digests.slice(-19), digest] },
  });
  await applyProviderStatus(
    credential.miniAppId,
    attempt.withdrawalId,
    credential.configuredByUserId,
    mapProviderStatus(data.status),
    trackId,
  );
  return Response.json({ ok: true });
}
