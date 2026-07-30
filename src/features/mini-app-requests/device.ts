import { createHmac, randomBytes } from "crypto";

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

export function hashRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", requestSecret()).update(`request-ip:${address}`).digest("hex");
}

function requestSecret() {
  const secret = process.env.DEVICE_IDENTIFIER_HASH_SECRET ?? process.env.REQUEST_IP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("DEVICE_IDENTIFIER_HASH_SECRET_UNAVAILABLE");
  return secret;
}

export function createStatusAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashStatusAccessToken(value: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(value)) throw new Error("INVALID_STATUS_ACCESS_TOKEN");
  return createHmac("sha256", requestSecret()).update(`status:${value}`).digest("hex");
}

export function requestStatusCookieName(reference: string) {
  return `ag_request_status_${reference.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export function requestAccessAllowed(input: {
  requestUserId?: string | null;
  sessionUserId?: string | null;
  requestDeviceHash: string;
  suppliedDeviceHash?: string;
  expectedTokenHash: string;
  suppliedTokenHash?: string;
}) {
  if (input.requestUserId && input.sessionUserId === input.requestUserId) return true;
  return Boolean(
    input.suppliedDeviceHash === input.requestDeviceHash &&
    input.suppliedTokenHash === input.expectedTokenHash,
  );
}

export function requestBlocksAnother(status: string, tenantStatus?: string | null) {
  return ["SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED"].includes(status) ||
    (status === "APPROVED" && tenantStatus === "ACTIVE");
}
