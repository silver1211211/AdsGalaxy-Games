import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADSGALAXY_WEBHOOK_VERSION = "2026-07-28";
export const ADSGALAXY_MAX_CALLBACK_BYTES = 64 * 1024;
export const ADSGALAXY_TIMESTAMP_TOLERANCE_SECONDS = 300;

export function callbackDigest(rawBody: Uint8Array) {
  return `sha256:${createHash("sha256").update(rawBody).digest("hex")}`;
}

export function verifyAdsGalaxySignature(input: {
  rawBody: Uint8Array;
  timestamp: string;
  eventId: string;
  signature: string;
  secret: string;
  now?: number;
}) {
  if (!/^\d{10}$/.test(input.timestamp) || !/^rwe_[A-Za-z0-9_-]{8,60}$/.test(input.eventId)) return false;
  if (!/^[a-f0-9]{64}$/i.test(input.signature)) return false;
  const now = input.now ?? Date.now();
  if (Math.abs(now / 1000 - Number(input.timestamp)) > ADSGALAXY_TIMESTAMP_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", input.secret)
    .update(Buffer.concat([
      Buffer.from(`${input.timestamp}.${input.eventId}.`, "utf8"),
      Buffer.from(input.rawBody),
    ]))
    .digest();
  const supplied = Buffer.from(input.signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
