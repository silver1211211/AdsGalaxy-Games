import { createHash, randomBytes } from "crypto";
import type { AdminCredentialScope } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  adminPasswordNeedsRehash,
  hashAdminPassword,
  verifyAdminPassword,
} from "./passwords";

export const ADMIN_ELEVATION_MAX_AGE_SECONDS = 20 * 60;
export const ADMIN_RECENT_AUTH_MS = 5 * 60_000;
const FAILURE_WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export const TENANT_ADMIN_ELEVATION_COOKIE = "ag_tenant_admin_elevation";
export const SUPER_ADMIN_ELEVATION_COOKIE = "ag_super_admin_elevation";

function cookieName(scopeType: AdminCredentialScope) {
  return scopeType === "SUPER_ADMIN" ? SUPER_ADMIN_ELEVATION_COOKIE : TENANT_ADMIN_ELEVATION_COOKIE;
}
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function cookieOptions(maxAge = ADMIN_ELEVATION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export type ElevationState =
  | { ok: true; id: string; verifiedAt: Date; expiresAt: Date; mustChangePassword: boolean; credentialVersion: number }
  | { ok: false; code: "PASSWORD_REQUIRED" | "CREDENTIAL_UNAVAILABLE" | "PASSWORD_CHANGE_REQUIRED" };

export async function getAdminElevation(input: {
  userId: string;
  scopeType: AdminCredentialScope;
  miniAppId?: string | null;
  allowPasswordChange?: boolean;
}): Promise<ElevationState> {
  const credential = await prisma.adminCredential.findUnique({
    where: { userId_scopeType: { userId: input.userId, scopeType: input.scopeType } },
    select: { id: true, credentialVersion: true, mustChangePassword: true },
  });
  if (!credential) return { ok: false, code: "CREDENTIAL_UNAVAILABLE" };
  const token = (await cookies()).get(cookieName(input.scopeType))?.value;
  if (!token) return { ok: false, code: "PASSWORD_REQUIRED" };
  const elevation = await prisma.adminElevationSession.findFirst({
    where: {
      tokenHash: tokenHash(token),
      userId: input.userId,
      credentialId: credential.id,
      scopeType: input.scopeType,
      miniAppId: input.scopeType === "TENANT_ADMIN" ? input.miniAppId : null,
      credentialVersion: credential.credentialVersion,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!elevation) return { ok: false, code: "PASSWORD_REQUIRED" };
  if (Date.now() - elevation.lastUsedAt.getTime() > 60_000) {
    void prisma.adminElevationSession.update({ where: { id: elevation.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  if (credential.mustChangePassword && !input.allowPasswordChange)
    return { ok: false, code: "PASSWORD_CHANGE_REQUIRED" };
  return {
    ok: true,
    id: elevation.id,
    verifiedAt: elevation.verifiedAt,
    expiresAt: elevation.expiresAt,
    mustChangePassword: credential.mustChangePassword,
    credentialVersion: credential.credentialVersion,
  };
}

export async function requireRecentAdminElevation(input: {
  userId: string;
  scopeType: AdminCredentialScope;
  miniAppId?: string | null;
}) {
  const elevation = await getAdminElevation({ ...input, allowPasswordChange: true });
  if (!elevation.ok || Date.now() - elevation.verifiedAt.getTime() > ADMIN_RECENT_AUTH_MS) {
    throw Response.json({ error: "Recent Administrator password verification is required.", code: "RECENT_ADMIN_PASSWORD_REQUIRED" }, { status: 403 });
  }
  return elevation;
}

export async function verifyAndIssueAdminElevation(input: {
  userId: string;
  scopeType: AdminCredentialScope;
  miniAppId?: string | null;
  password: string;
}) {
  const credential = await prisma.adminCredential.findUnique({
    where: { userId_scopeType: { userId: input.userId, scopeType: input.scopeType } },
  });
  if (!credential) throw Response.json({ error: "Administrator credential is unavailable.", code: "CREDENTIAL_UNAVAILABLE" }, { status: 409 });
  const now = new Date();
  if (credential.lockedUntil && credential.lockedUntil > now) {
    throw Response.json({ error: "Administrator verification is temporarily locked. Try again later.", code: "ADMIN_CREDENTIAL_LOCKED" }, { status: 423 });
  }

  const valid = await verifyAdminPassword(input.password, credential.passwordHash);
  if (!valid) {
    const insideWindow = credential.failedWindowStartedAt
      && now.getTime() - credential.failedWindowStartedAt.getTime() <= FAILURE_WINDOW_MS;
    const failedAttemptCount = insideWindow ? credential.failedAttemptCount + 1 : 1;
    const lockedUntil = failedAttemptCount >= MAX_FAILURES ? new Date(now.getTime() + LOCKOUT_MS) : null;
    await prisma.$transaction([
      prisma.adminCredential.update({
        where: { id: credential.id },
        data: {
          failedAttemptCount,
          failedWindowStartedAt: insideWindow ? credential.failedWindowStartedAt : now,
          lastFailedLoginAt: now,
          lockedUntil,
        },
      }),
      prisma.adminAuditLog.create({ data: {
        miniAppId: input.miniAppId ?? null,
        actorUserId: input.userId,
        action: lockedUntil ? "ADMIN_PASSWORD_LOCKOUT_CREATED" : "ADMIN_PASSWORD_VERIFICATION_FAILED",
        targetType: "AdminCredential",
        targetId: credential.id,
        metadata: { scopeType: input.scopeType, failedAttemptCount },
      } }),
      ...(failedAttemptCount >= MAX_FAILURES ? [prisma.notification.create({ data: {
        userId: input.userId,
        type: "SYSTEM",
        title: "Administrator verification temporarily locked",
        body: "Repeated failed Administrator password attempts triggered a temporary security lockout.",
        data: { scopeType: input.scopeType },
      } })] : []),
    ]);
    await new Promise((resolve) => setTimeout(resolve, Math.min(failedAttemptCount * 200, 1_000)));
    throw Response.json({
      error: lockedUntil ? "Administrator verification is temporarily locked." : "Administrator password is incorrect.",
      code: lockedUntil ? "ADMIN_CREDENTIAL_LOCKED" : "INVALID_ADMIN_PASSWORD",
    }, { status: lockedUntil ? 423 : 401 });
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ADMIN_ELEVATION_MAX_AGE_SECONDS * 1_000);
  const nextHash = adminPasswordNeedsRehash(credential.passwordHash)
    ? await hashAdminPassword(input.password)
    : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.adminCredential.update({
      where: { id: credential.id },
      data: {
        passwordHash: nextHash,
        failedAttemptCount: 0,
        failedWindowStartedAt: null,
        lockedUntil: null,
        lastVerifiedAt: now,
        lastSuccessfulLoginAt: now,
      },
    });
    const elevation = await tx.adminElevationSession.create({ data: {
      tokenHash: tokenHash(rawToken),
      userId: input.userId,
      credentialId: credential.id,
      miniAppId: input.scopeType === "TENANT_ADMIN" ? input.miniAppId : null,
      scopeType: input.scopeType,
      credentialVersion: credential.credentialVersion,
      verifiedAt: now,
      expiresAt,
    } });
    await tx.adminAuditLog.create({ data: {
      miniAppId: input.miniAppId ?? null,
      actorUserId: input.userId,
      action: "ADMIN_ELEVATED_SESSION_ISSUED",
      targetType: "AdminElevationSession",
      targetId: elevation.id,
      metadata: { scopeType: input.scopeType, expiresAt: expiresAt.toISOString() },
    } });
  });
  (await cookies()).set(cookieName(input.scopeType), rawToken, cookieOptions());
  return { mustChangePassword: credential.mustChangePassword, expiresAt };
}

export async function revokeAdminElevations(input: {
  credentialId: string;
  scopeType: AdminCredentialScope;
  actorUserId: string;
  miniAppId?: string | null;
}) {
  const result = await prisma.adminElevationSession.updateMany({
    where: { credentialId: input.credentialId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.adminAuditLog.create({ data: {
    miniAppId: input.miniAppId ?? null,
    actorUserId: input.actorUserId,
    action: "ADMIN_ELEVATED_SESSIONS_REVOKED",
    targetType: "AdminCredential",
    targetId: input.credentialId,
    metadata: { scopeType: input.scopeType, count: result.count },
  } });
  return result.count;
}

export async function clearAdminElevationCookie(scopeType: AdminCredentialScope) {
  (await cookies()).set(cookieName(scopeType), "", cookieOptions(0));
}
