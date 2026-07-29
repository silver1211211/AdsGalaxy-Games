import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { developmentAuthAllowed, developmentRole } from "../development-auth";
import { DEVELOPMENT_PREVIEW_COOKIE_NAME } from "../access-cookie-names";

export const PREVIEW_COOKIE_NAME = DEVELOPMENT_PREVIEW_COOKIE_NAME;
const MAX_AGE = 60 * 30;
export type PreviewPayload = {
  source: "DEVELOPMENT_PREVIEW"; role: "USER" | "ADMIN" | "SUPER_ADMIN"; exp: number;
};
function secret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("APP_SESSION_SECRET must contain at least 32 characters");
  return value;
}
function sign(body: string) { return createHmac("sha256", secret()).update(`preview:${body}`).digest("base64url"); }
export function createPreviewToken(role: PreviewPayload["role"]) {
  const body = Buffer.from(JSON.stringify({ source: "DEVELOPMENT_PREVIEW", role, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function verifyPreviewToken(token: string, host: string | null, env: NodeJS.ProcessEnv = process.env): PreviewPayload | null {
  if (!developmentAuthAllowed(host, env) || env.ALLOW_DEVELOPMENT_DIRECT_ACCESS !== "true" || env.DEV_PREVIEW_FALLBACK !== "true") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PreviewPayload;
    return payload.source === "DEVELOPMENT_PREVIEW" && Boolean(developmentRole(payload.role)) && payload.exp > Date.now() / 1000 ? payload : null;
  } catch { return null; }
}
export function previewCookie(token: string) {
  return { name: PREVIEW_COOKIE_NAME, value: token, httpOnly: true, sameSite: "lax" as const, secure: false, path: "/", maxAge: MAX_AGE };
}
export async function getPreviewSession(host: string | null) {
  if (process.env.NODE_ENV !== "development") return null;
  const token = (await cookies()).get(PREVIEW_COOKIE_NAME)?.value;
  return token ? verifyPreviewToken(token, host) : null;
}
export function directAccessRole(env: NodeJS.ProcessEnv = process.env): PreviewPayload["role"] {
  return developmentRole(env.DEV_DIRECT_ACCESS_ROLE ?? "SUPER_ADMIN") ?? "SUPER_ADMIN";
}
