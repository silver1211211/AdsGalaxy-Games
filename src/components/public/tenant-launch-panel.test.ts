import { describe, expect, it } from "vitest";
import { tenantLaunchDecision } from "../../features/tenant-admin/tenant-launch-state";

const decide = (overrides: Partial<Parameters<typeof tenantLaunchDecision>[0]> = {}) =>
  tenantLaunchDecision({
    ready: true,
    signedInitDataPresent: false,
    authenticationStatus: "BROWSER",
    authenticated: false,
    currentTenantSlug: "silver",
    tenantSlug: "silver",
    botConfigured: true,
    ...overrides,
  });

describe("tenant Telegram launch state machine", () => {
  it("shows the CTA only for a browser with a configured bot", () => {
    expect(decide()).toBe("BROWSER_CONFIGURED");
    expect(decide({ botConfigured: false })).toBe("BROWSER_UNCONFIGURED");
  });
  it("treats Telegram ordinary browser without signed initData as a browser", () => {
    expect(decide({ signedInitDataPresent: false })).toBe("BROWSER_CONFIGURED");
  });
  it("hides the CTA while authenticating and after successful authentication", () => {
    expect(decide({ signedInitDataPresent: true, authenticationStatus: "AUTHENTICATING" })).toBe("AUTHENTICATING");
    expect(decide({ signedInitDataPresent: true, authenticationStatus: "AUTHENTICATED", authenticated: true })).toBe("AUTHENTICATED");
  });
  it("fails safely for authentication failure or a wrong-tenant session", () => {
    expect(decide({ signedInitDataPresent: true, authenticationStatus: "FAILED" })).toBe("FAILED");
    expect(decide({ signedInitDataPresent: true, authenticationStatus: "AUTHENTICATED", authenticated: true, currentTenantSlug: "other" })).toBe("FAILED");
  });
});
