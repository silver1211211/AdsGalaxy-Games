import { beforeEach, describe, expect, it } from "vitest";
import { createPreviewToken, directAccessRole, verifyPreviewToken } from "./context";

const original = { ...process.env };
beforeEach(() => {
  process.env = {
    ...original,
    NODE_ENV: "development",
    ALLOW_DEVELOPMENT_AUTH: "true",
    ALLOW_DEVELOPMENT_DIRECT_ACCESS: "true",
    DEV_PREVIEW_FALLBACK: "true",
    APP_SESSION_SECRET: "unit-test-session-secret-at-least-32-characters"
  };
});

describe("development preview context", () => {
  it("creates a signed, expiring loopback-only preview token", () => {
    const token = createPreviewToken("SUPER_ADMIN");
    const payload = verifyPreviewToken(token, "localhost:3000");
    expect(payload?.source).toBe("DEVELOPMENT_PREVIEW");
    expect(payload?.role).toBe("SUPER_ADMIN");
    expect(payload!.exp).toBeGreaterThan(Date.now() / 1000);
  });
  it("accepts every supported loopback host and rejects public hosts", () => {
    const token = createPreviewToken("USER");
    expect(verifyPreviewToken(token, "127.0.0.1:3333")).not.toBeNull();
    expect(verifyPreviewToken(token, "[::1]:3000")).not.toBeNull();
    expect(verifyPreviewToken(token, "192.168.1.20:3000")).toBeNull();
    expect(verifyPreviewToken(token, "example.com")).toBeNull();
  });
  it("rejects tampering and production use even when flags are enabled", () => {
    const token = createPreviewToken("ADMIN");
    expect(verifyPreviewToken(`${token}x`, "localhost:3000")).toBeNull();
    expect(verifyPreviewToken(token, "localhost:3000", { ...process.env, NODE_ENV: "production" })).toBeNull();
  });
  it("uses a fixed role allow-list and safe default", () => {
    expect(directAccessRole({ NODE_ENV: "development", DEV_DIRECT_ACCESS_ROLE: "ADMIN" })).toBe("ADMIN");
    expect(directAccessRole({ NODE_ENV: "development", DEV_DIRECT_ACCESS_ROLE: "OWNER" })).toBe("SUPER_ADMIN");
  });
});
