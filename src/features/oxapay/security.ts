import { createHmac, timingSafeEqual } from "crypto";

export function oxaPayCallbackSignature(rawBody: Uint8Array, apiKey: string) {
  return createHmac("sha512", apiKey).update(rawBody).digest("hex");
}

export function verifyOxaPayCallback(
  rawBody: Uint8Array,
  suppliedSignature: string | null,
  apiKey: string,
) {
  if (!suppliedSignature) return false;
  const expected = oxaPayCallbackSignature(rawBody, apiKey);
  const supplied = suppliedSignature.trim().toLowerCase();
  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(
    Buffer.from(expected, "ascii"),
    Buffer.from(supplied, "ascii"),
  );
}
