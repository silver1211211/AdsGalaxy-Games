import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { APPLICATION_SESSION_COOKIE_NAME } from "./access-cookie-names";

export const SESSION_COOKIE_NAME = APPLICATION_SESSION_COOKIE_NAME;
const MAX_AGE_SECONDS = 60 * 60 * 12;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;

export type SessionPayload = {
  userId: string;
  miniAppId: string;
  membershipId: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  sessionId: string;
  exp: number;
  source?: "DEVELOPMENT";
};

function sessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SESSION_SECRET must contain at least 32 characters");
  return secret;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const body = encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }));
  return `${body}.${sign(body)}`;
}

export function sessionIdentifierHash(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  };
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const membership = await prisma.miniAppMembership.findFirst({
    where: {
      id: payload.membershipId,
      userId: payload.userId,
      miniAppId: payload.miniAppId,
      status: "ACTIVE",
      user: { status: "ACTIVE" }
    },
    include: { user: true, miniApp: true }
  });
  if (!membership) return null;
  const appSession = await prisma.appSession.findFirst({
    where: {
      id: payload.sessionId,
      tokenHash: sessionIdentifierHash(payload.sessionId),
      userId: payload.userId,
      miniAppId: payload.miniAppId,
      membershipId: payload.membershipId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });
  if (!appSession) return null;
  if (Date.now() - appSession.lastSeenAt.getTime() > 5 * 60 * 1000) {
    void prisma.appSession.update({ where: { id: appSession.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    void prisma.miniAppMembership.update({ where: { id: membership.id }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
  }
  return { ...payload, role: membership.role, user: membership.user, miniApp: membership.miniApp, appSession };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Response("Unauthorized", { status: 401 });
  if (session.role === "USER") {
    if(session.miniApp.status!=="ACTIVE"){
      const platform=await prisma.platformConfiguration.findUnique({where:{id:"platform"},select:{inactivitySuspensionMessage:true}});
      throw Response.json({error:session.miniApp.inactivityReason==="INACTIVITY"?(platform?.inactivitySuspensionMessage||"This Mini App is temporarily unavailable while its activity status is reviewed."):"This Mini App is temporarily unavailable.",code:"TENANT_SUSPENDED"},{status:503});
    }
    const [platform,settings] = await Promise.all([prisma.platformConfiguration.findUnique({where:{id:"platform"}}),prisma.tenantAdminSettings.findUnique({ where: { miniAppId: session.miniAppId }, select: { maintenanceMode: true, maintenanceMessage: true } })]);
    if(platform?.maintenanceMode)throw Response.json({error:platform.maintenanceMessage||"The platform is temporarily unavailable.",code:"PLATFORM_MAINTENANCE"},{status:503});
    if (settings?.maintenanceMode) throw Response.json({ error: settings.maintenanceMessage || "This Mini App is temporarily unavailable. Please try again later.", code: "MAINTENANCE_MODE" }, { status: 503 });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") throw new Response("Forbidden", { status: 403 });
  return session;
}

export async function requireSuperAdminIdentity() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") throw new Response("Forbidden", { status: 403 });
  return session;
}

export async function requireSuperAdmin(options?: { allowPasswordChange?: boolean }) {
  const session = await requireSuperAdminIdentity();
  const { getAdminElevation } = await import("@/features/admin-security/elevation");
  const elevation = await getAdminElevation({
    userId: session.userId,
    scopeType: "SUPER_ADMIN",
    allowPasswordChange: options?.allowPasswordChange,
  });
  if (!elevation.ok) {
    throw Response.json({ error: "Super Admin password verification is required.", code: elevation.code }, { status: 403 });
  }
  return { ...session, adminElevation: elevation };
}
