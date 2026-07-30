import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("database-backed local tenant access", () => {
  it("binds USER development sessions to the requested public tenant", () => {
    const route = source("src/app/api/dev/auth/session/route.ts");
    expect(route).toContain("developmentPublicTenantSlug(input.next)");
    expect(route).toContain('source: "LOCAL_DEVELOPMENT"');
    expect(route).toContain('source: "DEVELOPMENT"');
    expect(route).toContain("miniAppId: result.miniApp.id");
    expect(route).toContain("membershipId: result.membership.id");
    expect(route).toContain("tx.miniAppUserProfile.upsert");
    expect(route).toContain("tx.wallet.upsert");
  });

  it("recognizes only a server-validated local development session", () => {
    const sessionRoute = source("src/app/api/auth/session/route.ts");
    const provider = source(
      "src/components/providers/telegram-provider.tsx",
    );
    expect(sessionRoute).toContain('session.source === "DEVELOPMENT"');
    expect(sessionRoute).toContain("developmentAuthAllowed");
    expect(provider).toContain("session?.localDevelopment === true");
    expect(provider).toContain('"LOCAL_DEVELOPMENT_AUTHENTICATED"');
    expect(provider).not.toContain("mock Telegram");
  });

  it("keeps production fail-closed and external wallet actions blocked", () => {
    const policy = source("src/lib/development-auth.ts");
    const withdrawals = source("src/app/api/wallet/withdrawals/route.ts");
    const conversions = source("src/app/api/wallet/convert-points/route.ts");
    expect(policy).toContain('env.NODE_ENV !== "development"');
    expect(policy).toContain('env.ALLOW_DEVELOPMENT_AUTH !== "true"');
    expect(withdrawals).toContain('auth.source === "DEVELOPMENT"');
    expect(conversions).toContain('auth.source === "DEVELOPMENT"');
  });
});
