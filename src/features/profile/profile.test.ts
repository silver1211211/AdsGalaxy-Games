import { describe, expect, it } from "vitest";
import {
  avatarMimeAllowed, deviceLabel, effectiveDisplayName, initials, isValidTimezone,
  normalizeDisplayName, notificationSchema, preferenceSchema, profileUpdateSchema
} from "./profile";
import { PROFILE_ACCOUNT_ITEMS, PROFILE_PREFERENCE_GROUPS } from "./profile-ui";

describe("profile identity and validation", () => {
  it("uses the documented effective display-name priority", () => {
    const user = { firstName: "Ada", lastName: "Lovelace", username: "ada" };
    expect(effectiveDisplayName("Countess", user)).toBe("Countess");
    expect(effectiveDisplayName(null, user)).toBe("Ada Lovelace");
    expect(effectiveDisplayName(null, { username: "ada" })).toBe("ada");
    expect(effectiveDisplayName(null, {})).toBe("Player");
  });
  it("normalizes whitespace and rejects invisible or impersonating names", () => {
    expect(normalizeDisplayName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(profileUpdateSchema.parse({ displayNameOverride: "  Ada   Lovelace " }).displayNameOverride).toBe("Ada Lovelace");
    expect(() => profileUpdateSchema.parse({ displayNameOverride: "Official Admin" })).toThrow();
    expect(() => profileUpdateSchema.parse({ displayNameOverride: "A\u200bda" })).toThrow();
  });
  it("retains internal timezone validation but excludes timezone and language from public profile mutation", () => {
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidTimezone("Moon/Base")).toBe(false);
    expect(() => profileUpdateSchema.parse({ bio: "x".repeat(161) })).toThrow();
    expect(() => profileUpdateSchema.parse({ timezone: "UTC" })).toThrow();
    expect(() => profileUpdateSchema.parse({ locale: "en-US" })).toThrow();
    expect(() => profileUpdateSchema.parse({ username: "forged" })).toThrow();
    expect(() => preferenceSchema.parse({ locale: "fr-FR" })).toThrow();
  });
  it("creates safe initials and device labels", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/125.0")).toBe("Chrome on Windows");
  });
  it("checks avatar file signatures rather than trusting MIME alone", () => {
    expect(avatarMimeAllowed(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]), "image/png")).toBe(true);
    expect(avatarMimeAllowed(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]), "image/png")).toBe(false);
    expect(avatarMimeAllowed(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]), "image/svg+xml")).toBe(false);
  });
  it("does not allow disabling security notifications through the public schema", () => {
    expect(() => notificationSchema.parse({ securityNotifications: false })).toThrow();
  });
  it("exposes exactly two normal Account destinations", () => {
    expect(PROFILE_ACCOUNT_ITEMS.map(item => item.label)).toEqual(["Edit Profile", "Preferences and Notifications"]);
    expect(PROFILE_ACCOUNT_ITEMS).toHaveLength(2);
  });
  it("exposes exactly four requested preference controls", () => {
    const items: Array<{ label: string }> = PROFILE_PREFERENCE_GROUPS.flatMap(group => [...group.items] as Array<{ label: string }>);
    expect(PROFILE_PREFERENCE_GROUPS.map(group => group.title)).toEqual(["Notifications", "Game Experience"]);
    expect(items.map(item => item.label)).toEqual(["Wallet Rewards", "Task Updates", "Announcements", "Sound"]);
    expect(items).toHaveLength(4);
  });
  it("rejects all hidden preference fields and invalid values", () => {
    for (const key of ["themePreference","telegramNotifications","gameNotifications","reducedMotionEnabled","largerTapTargetsEnabled","simplifiedAnimations","hapticsEnabled"]) {
      expect(() => preferenceSchema.parse({ [key]: true })).toThrow();
    }
    expect(() => preferenceSchema.parse({ soundEnabled: "yes" })).toThrow();
    expect(preferenceSchema.parse({ soundEnabled: false })).toEqual({ soundEnabled: false });
  });
});
