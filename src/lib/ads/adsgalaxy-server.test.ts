import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  ADSGALAXY_TIMESTAMP_TOLERANCE_SECONDS,
  callbackDigest,
  verifyAdsGalaxySignature,
} from "./adsgalaxy-signature";

const secret = "whsec_test_callback_secret_123456789";
const eventId = "rwe_testevent123456";
const now = 1_800_000_000_000;
const timestamp = String(Math.floor(now / 1000));
const raw = Buffer.from('{"id":"rwe_testevent123456","type":"reward.eligible"}');

function signature(body = raw) {
  return createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.${eventId}.`), body]))
    .digest("hex");
}

describe("Ads Galaxy webhook v2 verification", () => {
  it("accepts the exact signed raw bytes", () => {
    expect(verifyAdsGalaxySignature({
      rawBody: raw,
      timestamp,
      eventId,
      signature: signature(),
      secret,
      now,
    })).toBe(true);
  });

  it("rejects modified bytes, malformed signatures, and stale timestamps", () => {
    expect(verifyAdsGalaxySignature({
      rawBody: Buffer.from(`${raw.toString()} `),
      timestamp,
      eventId,
      signature: signature(),
      secret,
      now,
    })).toBe(false);
    expect(verifyAdsGalaxySignature({
      rawBody: raw,
      timestamp,
      eventId,
      signature: "not-hex",
      secret,
      now,
    })).toBe(false);
    expect(verifyAdsGalaxySignature({
      rawBody: raw,
      timestamp,
      eventId,
      signature: signature(),
      secret,
      now: now + (ADSGALAXY_TIMESTAMP_TOLERANCE_SECONDS + 1) * 1000,
    })).toBe(false);
  });

  it("produces a stable non-secret payload digest", () => {
    expect(callbackDigest(raw)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(callbackDigest(raw)).toBe(callbackDigest(Buffer.from(raw)));
  });
});
