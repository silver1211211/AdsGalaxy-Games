export const GENERIC_LOGIN_ERROR = "Invalid password or account unavailable.";

export function configuredSuperAdminIdentifier(value: string | undefined) {
  const identifiers = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return identifiers.length === 1 && /^\d{5,20}$/.test(identifiers[0])
    ? identifiers[0]
    : null;
}

export function browserLoginDestination(mustChangePassword: boolean) {
  return mustChangePassword ? "/super-admin-security" : "/super-admin";
}

export function superAdminLoginEligibility(input: {
  userExists: boolean;
  userActive: boolean;
  membershipActive: boolean;
  platformMatches: boolean;
  credentialExists: boolean;
  lockedUntil?: Date | null;
  now?: Date;
}) {
  return Boolean(
    input.userExists &&
      input.userActive &&
      input.membershipActive &&
      input.platformMatches &&
      input.credentialExists &&
      (!input.lockedUntil || input.lockedUntil <= (input.now ?? new Date())),
  );
}

export function superAdminBrowserSessionBinding(input: {
  userId: string;
  miniAppId: string;
  membershipId: string;
}) {
  return {
    ...input,
    role: "SUPER_ADMIN" as const,
    source: "SUPER_ADMIN_BROWSER" as const,
  };
}

export function superAdminLogoutScope(userId: string, sessionId: string) {
  return {
    appSession: { id: sessionId, userId, revokedAt: null },
    elevation: { userId, scopeType: "SUPER_ADMIN" as const, revokedAt: null },
  };
}
