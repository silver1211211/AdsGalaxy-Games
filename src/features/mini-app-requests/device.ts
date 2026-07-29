import { createHmac } from "crypto";

export const REQUEST_DEVICE_COOKIE = "ag_request_device";
export const REQUEST_DEVICE_MAX_AGE = 60 * 60 * 24 * 365;

export function validDeviceIdentifier(value: string | undefined | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function hashDeviceIdentifier(value: string) {
  if (!validDeviceIdentifier(value)) throw new Error("INVALID_DEVICE_IDENTIFIER");
  const secret = process.env.DEVICE_IDENTIFIER_HASH_SECRET ?? process.env.REQUEST_IP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("DEVICE_IDENTIFIER_HASH_SECRET_UNAVAILABLE");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function requestBlocksAnother(status: string, tenantStatus?: string | null) {
  return ["SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED"].includes(status) ||
    (status === "APPROVED" && tenantStatus === "ACTIVE");
}
