import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tenantLaunchDecision } from "../../features/tenant-admin/tenant-launch-state";

const decide = (
  providerPhase:
    | "UNRESOLVED"
    | "BROWSER"
    | "TELEGRAM_AUTHENTICATING"
    | "TELEGRAM_AUTHENTICATED"
    | "TELEGRAM_FAILED"
    | "TENANT_MISMATCH",
  botConfigured = true,
) => tenantLaunchDecision({ providerPhase, botConfigured });

describe("tenant Telegram launch state machine", () => {
  it("starts unresolved and hides the CTA behind accessible loading text", () => {
    expect(decide("UNRESOLVED")).toBe("UNRESOLVED");
    const panel = readFileSync(
      "src/components/public/tenant-launch-panel.tsx",
      "utf8",
    );
    expect(panel).toContain("Checking secure launch environment");
  });
  it("shows the CTA only after browser detection resolves", () => {
    expect(decide("BROWSER")).toBe("BROWSER_CONFIGURED");
    expect(decide("BROWSER", false)).toBe("BROWSER_UNCONFIGURED");
  });
  it("hides the CTA throughout Telegram Desktop authentication", () => {
    expect(decide("TELEGRAM_AUTHENTICATING")).toBe("AUTHENTICATING");
    expect(decide("TELEGRAM_AUTHENTICATED")).toBe("AUTHENTICATED");
  });
  it("shows retry rather than a CTA for failure or tenant mismatch", () => {
    expect(decide("TELEGRAM_FAILED")).toBe("FAILED");
    expect(decide("TENANT_MISMATCH")).toBe("MISMATCH");
    const panel = readFileSync(
      "src/components/public/tenant-launch-panel.tsx",
      "utf8",
    );
    expect(panel).toContain("Retry authentication");
    expect(panel).toContain("Retry for this Mini App");
  });
});
