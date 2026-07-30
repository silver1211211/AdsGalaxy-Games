import { describe, expect, it } from "vitest";
import {
  isValidTenantSlug, telegramLaunchUrl, tenantAccessAllowed, tenantAdminPageDecision,
  tenantAdminLogoutScope, tenantAdminSelectionAllowed,
} from "./boundary";
import { miniAppSlugForPath, telegramTenantContextMatches, tenantPublicState } from "./tenant-launch";
import { tenantAdminBootstrapAllowed, tenantAdminCredentialState } from "./bootstrap-policy";
import { maskBotToken } from "./secrets";
import { canTransitionWithdrawal } from "./withdrawal-policy";

describe("tenant Admin boundary", () => {
  it("accepts silver and rejects malformed or reserved slugs", () => {
    expect(isValidTenantSlug("silver")).toBe(true);
    for (const slug of ["../admin", "OtherTenant", "games", "super-admin-login", "_next"])
      expect(isValidTenantSlug(slug)).toBe(false);
  });
  it("requires the exact active session membership and tenant", () => {
    const membership = { id: "member-a", miniAppId: "tenant-a", role: "ADMIN", status: "ACTIVE" };
    expect(tenantAccessAllowed({ sessionMiniAppId: "tenant-a", sessionMembershipId: "member-a", membership })).toBe(true);
    expect(tenantAccessAllowed({ sessionMiniAppId: "tenant-b", sessionMembershipId: "member-a", membership })).toBe(false);
    expect(tenantAccessAllowed({ sessionMiniAppId: "tenant-a", sessionMembershipId: "member-b", membership })).toBe(false);
  });
  it("routes unauthenticated and cross-tenant sessions safely", () => {
    const membership = { id: "m", miniAppId: "silver-id", role: "ADMIN", status: "ACTIVE" };
    expect(tenantAdminPageDecision({ session: null, tenantId: "silver-id" })).toBe("LOGIN");
    expect(tenantAdminPageDecision({ session: { role: "USER", miniAppId: "silver-id", membershipId: "m" }, tenantId: "silver-id", membership })).toBe("TENANT");
    expect(tenantAdminPageDecision({ session: { role: "ADMIN", miniAppId: "other-id", membershipId: "m" }, tenantId: "silver-id", membership })).toBe("TENANT");
    expect(tenantAdminPageDecision({ session: { role: "ADMIN", miniAppId: "silver-id", membershipId: "m" }, tenantId: "silver-id", membership })).toBe("ALLOW");
  });
  it("derives Telegram authentication from the current tenant URL", () => {
    expect(miniAppSlugForPath("/silver/", "ads-galaxy")).toBe("silver");
    expect(miniAppSlugForPath("/games", "ads-galaxy")).toBe("ads-galaxy");
  });
  it("creates only a validated tenant-specific Telegram launch URL", () => {
    expect(telegramLaunchUrl("@SilverTenantBot", "silver")).toBe("https://t.me/SilverTenantBot?startapp=silver");
    expect(telegramLaunchUrl(null, "silver")).toBeNull();
    expect(telegramLaunchUrl("bad-name", "silver")).toBeNull();
  });
  it("accepts matching or absent signed context and rejects cross-tenant context", () => {
    expect(telegramTenantContextMatches("silver", "silver")).toBe(true);
    expect(telegramTenantContextMatches("silver")).toBe(true);
    expect(telegramTenantContextMatches("silver", "ads-galaxy")).toBe(false);
  });
  it("classifies public tenant records without exposing inactive tenants", () => {
    expect(tenantPublicState({ exists: false })).toBe("NOT_FOUND");
    expect(tenantPublicState({ exists: true, status: "ACTIVE" })).toBe("ACTIVE");
    expect(tenantPublicState({ exists: true, status: "PAUSED" })).toBe("UNAVAILABLE");
    expect(tenantPublicState({ exists: true, status: "ARCHIVED" })).toBe("UNAVAILABLE");
    expect(tenantPublicState({ exists: true, status: "ACTIVE", maintenanceMode: true })).toBe("UNAVAILABLE");
  });
  it("fails closed when bootstrap would create a second primary Administrator", () => {
    expect(tenantAdminBootstrapAllowed({ tenantExists: true, tenantStatus: "ACTIVE", activeAdminUserIds: [] }).ok).toBe(true);
    expect(tenantAdminBootstrapAllowed({ tenantExists: true, tenantStatus: "ACTIVE", activeAdminUserIds: ["other"], targetUserId: "target" })).toEqual({ ok: false, code: "ACTIVE_ADMIN_ALREADY_EXISTS" });
    expect(tenantAdminBootstrapAllowed({ tenantExists: true, tenantStatus: "PAUSED", activeAdminUserIds: [] }).ok).toBe(false);
    expect(tenantAdminBootstrapAllowed({ tenantExists: true, tenantStatus: "ACTIVE", targetUserStatus: "BANNED", activeAdminUserIds: [] }).ok).toBe(false);
  });
  it("builds only a forced-change temporary credential state", () => {
    const state = tenantAdminCredentialState("bcrypt-hash", "actor");
    expect(state.passwordHash).toBe("bcrypt-hash");
    expect(state.temporaryPassword).toBe(true);
    expect(state.mustChangePassword).toBe(true);
    expect(state.failedAttemptCount).toBe(0);
    expect(state.lockedUntil).toBeNull();
  });
  it("requires exactly one primary Administrator and binds logout to the tenant", () => {
    expect(tenantAdminSelectionAllowed(0)).toBe(false);
    expect(tenantAdminSelectionAllowed(1)).toBe(true);
    expect(tenantAdminSelectionAllowed(2)).toBe(false);
    expect(tenantAdminLogoutScope("user", "silver-id", "session")).toEqual({
      appSession: { id: "session", userId: "user", miniAppId: "silver-id", revokedAt: null },
      elevation: { userId: "user", miniAppId: "silver-id", scopeType: "TENANT_ADMIN", revokedAt: null },
    });
  });
  it("rejects users and suspended admins", () => {
    expect(tenantAccessAllowed({ sessionMiniAppId: "a", sessionMembershipId: "m", membership: { id: "m", miniAppId: "a", role: "USER", status: "ACTIVE" } })).toBe(false);
    expect(tenantAccessAllowed({ sessionMiniAppId: "a", sessionMembershipId: "m", membership: { id: "m", miniAppId: "a", role: "ADMIN", status: "SUSPENDED" } })).toBe(false);
  });
  it("never exposes a complete bot token", () => {
    const token = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234", masked = maskBotToken(token);
    expect(masked).not.toContain(token);
    expect(masked.endsWith("1234")).toBe(true);
  });
  it("allows only reviewed withdrawal transitions", () => {
    expect(canTransitionWithdrawal("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionWithdrawal("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionWithdrawal("COMPLETED", "REJECTED")).toBe(false);
  });
});
