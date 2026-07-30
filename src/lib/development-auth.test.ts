import { describe, expect, it } from "vitest";
import {
  classifyDevelopmentDatabaseError,
  developmentAuthAllowed,
  developmentAdminTenantSlug,
  developmentIdentity,
  developmentPublicTenantSlug,
  developmentTenantSlug,
  developmentSuperAdminIdentity,
  developmentRole,
  developmentRouteVisible,
  normalizedHost,
  safeDevelopmentRedirect,
  validatedDevelopmentRedirect,
} from "./development-auth";
const enabled = {
  NODE_ENV: "development",
  ALLOW_DEVELOPMENT_AUTH: "true",
  DEV_AUTH_ALLOWED_HOSTS: "localhost,127.0.0.1,[::1]",
} as NodeJS.ProcessEnv;
describe("development authentication boundary", () => {
  it("is hidden in production even when accidentally enabled", () =>
    expect(
      developmentAuthAllowed("localhost:3000", {
        ...enabled,
        NODE_ENV: "production",
      }),
    ).toBe(false));
  it("is hidden when the explicit flag is disabled", () =>
    expect(
      developmentAuthAllowed("localhost:3000", {
        ...enabled,
        ALLOW_DEVELOPMENT_AUTH: "false",
      }),
    ).toBe(false));
  it("keeps the local setup page visible when the flag is disabled", () =>
    expect(
      developmentRouteVisible("localhost:3000", {
        ...enabled,
        ALLOW_DEVELOPMENT_AUTH: "false",
      }),
    ).toBe(true));
  it("accepts only configured loopback hosts", () => {
    expect(developmentAuthAllowed("localhost:3000", enabled)).toBe(true);
    expect(developmentAuthAllowed("127.0.0.1:3000", enabled)).toBe(true);
    expect(developmentAuthAllowed("[::1]:3000", enabled)).toBe(true);
    expect(developmentAuthAllowed("192.168.1.20:3000", enabled)).toBe(false);
    expect(developmentAuthAllowed("example.com", enabled)).toBe(false);
  });
  it("normalizes ports and IPv6 brackets", () => {
    expect(normalizedHost("localhost:3000")).toBe("localhost");
    expect(normalizedHost("[::1]:3000")).toBe("::1");
  });
  it("uses a fixed role allow-list", () => {
    expect(developmentRole("USER")).toBe("USER");
    expect(developmentRole("ADMIN")).toBe("ADMIN");
    expect(developmentRole("SUPER_ADMIN")).toBe("SUPER_ADMIN");
    expect(developmentRole("OWNER")).toBeNull();
  });
  it("rejects external and ambiguous redirects", () => {
    expect(safeDevelopmentRedirect("/games/tap-collector")).toBe(
      "/games/tap-collector",
    );
    expect(safeDevelopmentRedirect("https://evil.test")).toBe("/games");
    expect(safeDevelopmentRedirect("//evil.test")).toBe("/games");
    expect(safeDevelopmentRedirect("/\\evil.test")).toBe("/games");
    expect(safeDevelopmentRedirect("/%2F%2Fevil.test")).toBe("/games");
  });
  it("strictly rejects invalid auto-auth next URLs", () => {
    expect(validatedDevelopmentRedirect("/games")).toBe("/games");
    expect(validatedDevelopmentRedirect("https://evil.test")).toBeNull();
    expect(validatedDevelopmentRedirect("//evil.test")).toBeNull();
  });
  it("resolves an existing tenant only from a validated admin route", () => {
    expect(developmentAdminTenantSlug("/test/admin")).toBe("test");
    expect(developmentAdminTenantSlug("/test/admin/settings")).toBe("test");
    expect(developmentAdminTenantSlug("/games")).toBeNull();
    expect(developmentAdminTenantSlug("//evil.test/admin")).toBeNull();
  });
  it("resolves a local USER tenant only from a canonical public tenant path", () => {
    expect(developmentTenantSlug("silver")).toBe("silver");
    expect(developmentTenantSlug("games")).toBeNull();
    expect(developmentTenantSlug("../silver")).toBeNull();
    expect(developmentPublicTenantSlug("/silver")).toBe("silver");
    expect(developmentPublicTenantSlug("/silver/")).toBe("silver");
    expect(developmentPublicTenantSlug("/silver/admin")).toBeNull();
    expect(developmentPublicTenantSlug("/games")).toBeNull();
  });
  it("never accepts browser-selected identity fields", () => {
    const identity = developmentIdentity({
      ...enabled,
      DEV_AUTH_TELEGRAM_ID: "999000001",
    });
    expect(identity.telegramId).toBe(BigInt("999000001"));
    expect(Object.keys(identity)).not.toContain("role");
  });
  it("uses a separate fixed local Super Admin identity", () => {
    const identity = developmentSuperAdminIdentity({
      ...enabled,
      DEV_SUPER_ADMIN_TELEGRAM_ID: "999000003",
    });
    expect(identity.telegramId).toBe(BigInt("999000003"));
    expect(identity.username).toBe("local_super_admin");
    expect(Object.keys(identity)).not.toContain("role");
  });
  it("classifies safe database failures", () => {
    expect(classifyDevelopmentDatabaseError({ code: "P1001" })).toBe(
      "UNREACHABLE",
    );
    expect(classifyDevelopmentDatabaseError({ code: "P2021" })).toBe(
      "MISSING_TABLES",
    );
  });
});
