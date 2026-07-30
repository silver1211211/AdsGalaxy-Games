export function tenantAdminBootstrapAllowed(input: {
  tenantExists: boolean;
  tenantStatus?: string;
  targetUserStatus?: string | null;
  activeAdminUserIds: string[];
  targetUserId?: string | null;
}) {
  if (!input.tenantExists) return { ok: false as const, code: "TENANT_NOT_FOUND" };
  if (input.tenantStatus !== "ACTIVE") return { ok: false as const, code: "TENANT_NOT_ACTIVE" };
  if (input.targetUserStatus === "BANNED" || input.targetUserStatus === "DELETED")
    return { ok: false as const, code: "USER_UNAVAILABLE" };
  const otherAdmins = input.activeAdminUserIds.filter((id) => id !== input.targetUserId);
  if (otherAdmins.length) return { ok: false as const, code: "ACTIVE_ADMIN_ALREADY_EXISTS" };
  return { ok: true as const };
}

export function tenantAdminCredentialState(passwordHash: string, resetByUserId: string) {
  return {
    passwordHash,
    temporaryPassword: true,
    mustChangePassword: true,
    passwordChangedAt: null,
    failedAttemptCount: 0,
    failedWindowStartedAt: null,
    lockedUntil: null,
    resetByUserId,
    resetAt: new Date(),
  };
}
