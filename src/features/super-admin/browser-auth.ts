import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
  sessionIdentifierHash,
} from "@/lib/session";
import { deviceLabel } from "@/features/profile/profile";
import {
  SUPER_ADMIN_ELEVATION_COOKIE,
  verifyAndIssueAdminElevation,
} from "@/features/admin-security/elevation";
import {
  browserLoginDestination,
  configuredSuperAdminIdentifier,
  superAdminBrowserSessionBinding,
  superAdminLoginEligibility,
  superAdminLogoutScope,
} from "./browser-auth-policy";

export { GENERIC_LOGIN_ERROR } from "./browser-auth-policy";

export function loginIdentifierHash(identifier: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("APP_SESSION_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret)
    .update(`super-admin-login:${identifier}`)
    .digest("hex");
}

export function requestIpHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return loginIdentifierHash(`ip:${address}`);
}

async function recordRejectedLogin(input: {
  identifierHash: string;
  reason: string;
  actorUserId?: string;
  miniAppId?: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      miniAppId: input.miniAppId,
      action: "SUPER_ADMIN_BROWSER_LOGIN_REJECTED",
      targetType: "SuperAdminBrowserLogin",
      targetId: input.identifierHash.slice(0, 24),
      metadata: { reason: input.reason },
    },
  });
}

export async function authenticateSuperAdminBrowser(input: {
  password: string;
  request: Request;
}) {
  const identifier = configuredSuperAdminIdentifier(process.env.SUPER_ADMIN_TELEGRAM_IDS);
  const identifierHash = loginIdentifierHash(identifier ?? "configuration-unavailable");
  if (!identifier) {
    await recordRejectedLogin({ identifierHash, reason: "CONFIGURATION_UNAVAILABLE" });
    throw new Error("INVALID_CREDENTIALS");
  }

  const platformSlug = process.env.PLATFORM_MINI_APP_SLUG ?? "ads-galaxy";
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(identifier) },
    select: {
      id: true,
      status: true,
      memberships: {
        where: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          miniApp: { slug: platformSlug, status: "ACTIVE" },
        },
        select: { id: true, miniAppId: true },
        take: 1,
      },
      adminCredentials: {
        where: { scopeType: "SUPER_ADMIN" },
        select: { id: true, lockedUntil: true },
        take: 1,
      },
    },
  });
  const membership = user?.memberships[0];
  const credential = user?.adminCredentials[0];
  if (!superAdminLoginEligibility({
    userExists: Boolean(user),
    userActive: user?.status === "ACTIVE",
    membershipActive: Boolean(membership),
    platformMatches: Boolean(membership),
    credentialExists: Boolean(credential),
    lockedUntil: credential?.lockedUntil,
  })) {
    await recordRejectedLogin({
      identifierHash,
      reason: "IDENTITY_UNAVAILABLE",
      actorUserId: user?.id,
      miniAppId: membership?.miniAppId,
    });
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!user || !membership || !credential)
    throw new Error("INVALID_CREDENTIALS");
  let elevation: Awaited<ReturnType<typeof verifyAndIssueAdminElevation>>;
  try {
    elevation = await verifyAndIssueAdminElevation({
      userId: user.id,
      scopeType: "SUPER_ADMIN",
      password: input.password,
    });
  } catch {
    throw new Error("INVALID_CREDENTIALS");
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const binding = superAdminBrowserSessionBinding({
    userId: user.id,
    miniAppId: membership.miniAppId,
    membershipId: membership.id,
  });
  await prisma.$transaction([
    prisma.appSession.create({
      data: {
        id: sessionId,
        miniAppId: binding.miniAppId,
        userId: binding.userId,
        membershipId: binding.membershipId,
        tokenHash: sessionIdentifierHash(sessionId),
        source: binding.source,
        expiresAt,
        userAgentSummary: input.request.headers.get("user-agent")?.slice(0, 120),
        deviceLabel: deviceLabel(input.request.headers.get("user-agent")),
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorUserId: user.id,
        miniAppId: membership.miniAppId,
        action: "SUPER_ADMIN_BROWSER_LOGIN_SUCCEEDED",
        targetType: "AppSession",
        targetId: sessionId,
        metadata: { source: "SUPER_ADMIN_BROWSER" },
      },
    }),
  ]);
  const token = createSessionToken({
    userId: binding.userId,
    miniAppId: binding.miniAppId,
    membershipId: binding.membershipId,
    role: binding.role,
    sessionId,
  });
  (await cookies()).set(sessionCookie(token));
  return {
    destination: browserLoginDestination(elevation.mustChangePassword),
    sessionId,
  };
}

export async function revokeSuperAdminBrowserSession(input: {
  sessionId: string;
  userId: string;
}) {
  const now = new Date();
  const scope = superAdminLogoutScope(input.userId, input.sessionId);
  await prisma.$transaction([
    prisma.appSession.updateMany({
      where: scope.appSession,
      data: { revokedAt: now },
    }),
    prisma.adminElevationSession.updateMany({
      where: scope.elevation,
      data: { revokedAt: now },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorUserId: input.userId,
        action: "SUPER_ADMIN_BROWSER_LOGOUT",
        targetType: "AppSession",
        targetId: input.sessionId,
      },
    }),
  ]);
  const jar = await cookies();
  jar.set(sessionCookie(""));
  jar.set(SUPER_ADMIN_ELEVATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
