export const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
export function isValidTenantSlug(slug: string) {
  return slug.length >= 2 && slug.length <= 64 && TENANT_SLUG_PATTERN.test(slug);
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
