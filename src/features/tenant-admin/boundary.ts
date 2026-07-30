export const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
export const RESERVED_TENANT_SLUGS = new Set([
  "admin", "api", "super-admin", "super-admin-login", "request-mini-app",
  "games", "wallet", "profile", "tasks", "dev", "terms", "privacy", "_next",
]);
export function isValidTenantSlug(slug: string) {
  return slug.length >= 3 && slug.length <= 64 && TENANT_SLUG_PATTERN.test(slug)
    && !RESERVED_TENANT_SLUGS.has(slug);
}

export function telegramLaunchUrl(botUsername: string | null | undefined, tenantSlug: string) {
  const username = botUsername?.trim().replace(/^@/, "");
  if (!isValidTenantSlug(tenantSlug) || !username || !/^[A-Za-z0-9_]{5,64}$/.test(username))
    return null;
  return `https://t.me/${username}?startapp=${encodeURIComponent(tenantSlug)}`;
}
export function tenantAccessAllowed(input: {
  sessionMiniAppId: string;
  sessionMembershipId: string;
  membership: { id: string; miniAppId: string; role: string; status: string };
}) {
  const { membership } = input;
  return membership.status === "ACTIVE"
    && (membership.role === "ADMIN" || membership.role === "SUPER_ADMIN")
    && membership.id === input.sessionMembershipId
    && membership.miniAppId === input.sessionMiniAppId;
}

export function tenantAdminPageDecision(input: {
  session: null | { role: string; miniAppId: string; membershipId: string };
  tenantId: string;
  membership?: { id: string; miniAppId: string; role: string; status: string } | null;
}) {
  if (!input.session) return "LOGIN" as const;
  if (!["ADMIN", "SUPER_ADMIN"].includes(input.session.role)) return "LOGIN" as const;
  if (input.session.miniAppId !== input.tenantId) return "LOGIN" as const;
  if (!input.membership || !tenantAccessAllowed({
    sessionMiniAppId: input.session.miniAppId,
    sessionMembershipId: input.session.membershipId,
    membership: input.membership,
  })) return "LOGIN" as const;
  return "ALLOW" as const;
}

export function tenantAdminSelectionAllowed(activeAdministratorCount: number) {
  return activeAdministratorCount === 1;
}

export function tenantAdminLogoutScope(userId: string, miniAppId: string, sessionId: string) {
  return {
    appSession: { id: sessionId, userId, miniAppId, revokedAt: null },
    elevation: { userId, miniAppId, scopeType: "TENANT_ADMIN" as const, revokedAt: null },
  };
}
