import { describe, expect, it, vi } from "vitest";
import {
  browserLoginDestination,
  normalizeSuperAdminIdentifier,
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
  it("accepts an approved numeric identifier without a Telegram username", () => {
    expect(normalizeSuperAdminIdentifier("123456789")).toBe("123456789");
    expect(normalizeSuperAdminIdentifier("@owner")).toBeNull();
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
