import { describe, expect, it, vi } from "vitest";
import {
  browserLoginDestination,
  browserLoginErrorMessage,
  configuredSuperAdminIdentifier,
  superAdminBrowserSessionBinding,
  superAdminLoginEligibility,
  superAdminLogoutScope,
} from "./browser-auth-policy";

const eligible = {
  userExists: true,
  userActive: true,
  membershipActive: true,
  platformMatches: true,
  credentialExists: true,
  lockedUntil: null,
};

describe("Super Admin browser authentication policy", () => {
  it("maps login HTTP failures to structured safe messages", () => {
    expect(browserLoginErrorMessage(403)).toBe("Request origin could not be verified.");
    expect(browserLoginErrorMessage(415)).toBe("Unsupported request format.");
    expect(browserLoginErrorMessage(413)).toBe("Request body is too large.");
    expect(browserLoginErrorMessage(429)).toBe("Too many login attempts. Try again later.");
  });
  it("resolves exactly one configured numeric identifier server-side", () => {
    expect(configuredSuperAdminIdentifier("123456789")).toBe("123456789");
    expect(configuredSuperAdminIdentifier("123456789,987654321")).toBeNull();
    expect(configuredSuperAdminIdentifier("@owner")).toBeNull();
    expect(configuredSuperAdminIdentifier(undefined)).toBeNull();
  });

  it("accepts a valid active platform Super Admin credential", () => {
    expect(superAdminLoginEligibility(eligible)).toBe(true);
  });

  it.each([
    ["unknown identifier", { userExists: false }],
    ["inactive user", { userActive: false }],
    ["missing or inactive membership", { membershipActive: false }],
    ["membership for another tenant", { platformMatches: false }],
    ["missing credential", { credentialExists: false }],
  ])("rejects %s", (_label, change) => {
    expect(superAdminLoginEligibility({ ...eligible, ...change })).toBe(false);
  });

  it("rejects a locked credential", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    expect(
      superAdminLoginEligibility({
        ...eligible,
        lockedUntil: new Date("2026-07-29T12:15:00Z"),
      }),
    ).toBe(false);
    vi.useRealTimers();
  });

  it("routes forced password changes through Super Admin security", () => {
    expect(browserLoginDestination(true)).toBe("/super-admin-security");
    expect(browserLoginDestination(false)).toBe("/super-admin");
  });

  it("does not require any Telegram bot configuration", () => {
    expect(superAdminLoginEligibility(eligible)).toBe(true);
  });

  it("creates a platform-bound Super Admin browser session", () => {
    expect(superAdminBrowserSessionBinding({
      userId: "user-1",
      miniAppId: "platform-tenant",
      membershipId: "membership-1",
    })).toEqual({
      userId: "user-1",
      miniAppId: "platform-tenant",
      membershipId: "membership-1",
      role: "SUPER_ADMIN",
      source: "SUPER_ADMIN_BROWSER",
    });
  });

  it("revokes the current AppSession and Super Admin elevation on logout", () => {
    expect(superAdminLogoutScope("user-1", "session-1")).toEqual({
      appSession: { id: "session-1", userId: "user-1", revokedAt: null },
      elevation: { userId: "user-1", scopeType: "SUPER_ADMIN", revokedAt: null },
    });
  });
});
