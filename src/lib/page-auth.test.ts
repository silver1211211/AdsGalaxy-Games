import { describe, expect, it } from "vitest";
import { pageAuthorizationDecision, superAdminPageAuthorizationDecision, superAdminPlatformBindingDecision } from "./page-auth";

const session = (role: "USER" | "ADMIN" | "SUPER_ADMIN" = "USER", source?: "DEVELOPMENT") =>
  ({ role, source }) as Parameters<typeof pageAuthorizationDecision>[0];

describe("server page authorization", () => {
  it("redirects missing, expired, revoked, and suspended sessions represented by null", () => {
    for (const invalid of [null, null, null, null])
      expect(pageAuthorizationDecision(invalid)).toBe("HOME");
  });

  it("allows authenticated users into user pages", () => {
    expect(pageAuthorizationDecision(session("USER"))).toBe("ALLOW");
  });

  it("enforces Admin and Super Admin roles without throwing Response objects", () => {
    expect(() =>
      pageAuthorizationDecision(session("USER"), { roles: ["SUPER_ADMIN"] }),
    ).not.toThrow();
    expect(
      pageAuthorizationDecision(session("USER"), { roles: ["SUPER_ADMIN"] }),
    ).toBe("HOME");
    expect(
      pageAuthorizationDecision(session("SUPER_ADMIN"), {
        roles: ["SUPER_ADMIN"],
      }),
    ).toBe("ALLOW");
  });

  it("permits development sessions only for an approved local host", () => {
    expect(pageAuthorizationDecision(session("USER", "DEVELOPMENT"))).toBe(
      "HOME",
    );
    expect(
      pageAuthorizationDecision(session("USER", "DEVELOPMENT"), {
        developmentHostAllowed: true,
      }),
    ).toBe("ALLOW");
  });
});

describe("Super Admin page authorization", () => {
  it("redirects unauthenticated visitors to the browser login", () => {
    expect(superAdminPageAuthorizationDecision(null)).toBe("LOGIN");
  });
  it("sends normal users and tenant Admins to Super Admin login", () => {
    expect(superAdminPageAuthorizationDecision(session("USER"))).toBe("LOGIN");
    expect(superAdminPageAuthorizationDecision(session("ADMIN"))).toBe("LOGIN");
  });
  it("allows a database-backed Super Admin session", () => {
    expect(superAdminPageAuthorizationDecision(session("SUPER_ADMIN"))).toBe("ALLOW");
  });
  it("requires the active configured platform tenant and a credential", () => {
    const bound = {
      role: "SUPER_ADMIN",
      miniApp: { slug: "ads-galaxy", status: "ACTIVE" },
    } as Parameters<typeof superAdminPlatformBindingDecision>[0];
    expect(superAdminPlatformBindingDecision(bound, "ads-galaxy", true)).toBe("ALLOW");
    expect(superAdminPlatformBindingDecision(bound, "other", true)).toBe("LOGIN");
    expect(superAdminPlatformBindingDecision({ ...bound, miniApp: { slug: "ads-galaxy", status: "PAUSED" } } as typeof bound, "ads-galaxy", true)).toBe("LOGIN");
    expect(superAdminPlatformBindingDecision(bound, "ads-galaxy", false)).toBe("LOGIN");
  });
});
