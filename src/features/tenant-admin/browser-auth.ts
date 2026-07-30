import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { deviceLabel } from "@/features/profile/profile";
import { verifyAndIssueAdminElevation } from "@/features/admin-security/elevation";
import {
  createSessionToken, SESSION_MAX_AGE_SECONDS, sessionCookie, sessionIdentifierHash,
} from "@/lib/session";
import { isValidTenantSlug, tenantAdminLogoutScope, tenantAdminSelectionAllowed } from "./boundary";

export const TENANT_ADMIN_LOGIN_ERROR = "Invalid password or Administrator account unavailable.";

async function rejected(miniAppId: string | undefined, reason: string) {
  await prisma.adminAuditLog.create({
    data: {
      miniAppId, action: "TENANT_ADMIN_BROWSER_LOGIN_REJECTED",
      targetType: "TenantAdminBrowserLogin", metadata: { reason },
    },
  }).catch(() => undefined);
}

export async function authenticateTenantAdministrator(input: {
  tenantSlug: string;
  password: string;
  request: Request;
}) {
  if (!isValidTenantSlug(input.tenantSlug)) throw new Error("INVALID_LOGIN");
  const tenant = await prisma.miniApp.findFirst({
    where: { slug: input.tenantSlug, status: "ACTIVE" },
    select: {
      id: true, slug: true,
      memberships: {
        where: { role: "ADMIN", status: "ACTIVE", user: { status: "ACTIVE" } },
        select: { id: true, userId: true },
        take: 2,
      },
    },
  });
  if (!tenant || !tenantAdminSelectionAllowed(tenant.memberships.length)) {
    await rejected(tenant?.id, tenant ? "ADMINISTRATOR_SELECTION_UNAVAILABLE" : "TENANT_UNAVAILABLE");
    throw new Error("INVALID_LOGIN");
  }
  const membership = tenant.memberships[0];
  const credential = await prisma.adminCredential.findUnique({
    where: { userId_scopeType: { userId: membership.userId, scopeType: "TENANT_ADMIN" } },
    select: { id: true, lockedUntil: true },
  });
  if (!credential || (credential.lockedUntil && credential.lockedUntil > new Date())) {
    await rejected(tenant.id, credential ? "CREDENTIAL_LOCKED" : "CREDENTIAL_UNAVAILABLE");
    throw new Error("INVALID_LOGIN");
  }

  let elevation: Awaited<ReturnType<typeof verifyAndIssueAdminElevation>>;
  try {
    elevation = await verifyAndIssueAdminElevation({
      userId: membership.userId,
      scopeType: "TENANT_ADMIN",
      miniAppId: tenant.id,
      password: input.password,
    });
  } catch {
    throw new Error("INVALID_LOGIN");
  }

  const sessionId = crypto.randomUUID();
  await prisma.$transaction([
    prisma.appSession.create({
      data: {
        id: sessionId,
        miniAppId: tenant.id,
        userId: membership.userId,
        membershipId: membership.id,
        tokenHash: sessionIdentifierHash(sessionId),
        source: "TENANT_ADMIN_BROWSER",
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        userAgentSummary: input.request.headers.get("user-agent")?.slice(0, 120),
        deviceLabel: deviceLabel(input.request.headers.get("user-agent")),
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        miniAppId: tenant.id,
        actorUserId: membership.userId,
        action: "TENANT_ADMIN_BROWSER_LOGIN_SUCCEEDED",
        targetType: "AppSession",
        targetId: sessionId,
      },
    }),
  ]);
  const token = createSessionToken({
    userId: membership.userId,
    miniAppId: tenant.id,
    membershipId: membership.id,
    role: "ADMIN",
    sessionId,
  });
  (await cookies()).set(sessionCookie(token));
  return {
    destination: elevation.mustChangePassword
      ? `/${tenant.slug}/administrator-security`
      : `/${tenant.slug}/admin`,
  };
}

export async function revokeTenantAdministratorSession(input: {
  sessionId: string;
  userId: string;
  miniAppId: string;
}) {
  const now = new Date();
  const scope = tenantAdminLogoutScope(input.userId, input.miniAppId, input.sessionId);
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
        miniAppId: input.miniAppId, actorUserId: input.userId,
        action: "TENANT_ADMIN_BROWSER_LOGOUT", targetType: "AppSession", targetId: input.sessionId,
      },
    }),
  ]);
}
