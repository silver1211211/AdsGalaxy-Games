import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("existing tenant Administrator bootstrap command", () => {
  const source = readFileSync("scripts/bootstrap-tenant-admin.ts", "utf8");
  it("targets exact slug and numeric Telegram identity without a source default", () => {
    expect(source).toContain('argument("slug")');
    expect(source).toContain('argument("telegram-id")');
    expect(source).not.toContain('telegramId: BigInt("');
    expect(source).not.toContain('password = "1234"');
  });
  it("requires explicit confirmation and hidden matching password input", () => {
    expect(source).toContain("setRawMode(true)");
    expect(source).toContain("Type ${tenant.slug} to confirm provisioning");
    expect(source).toContain("password !== repeated");
  });
  it("creates only ADMIN membership and a hashed forced-change credential", () => {
    expect(source).toContain('role: "ADMIN"');
    expect(source).not.toContain('role: "SUPER_ADMIN"');
    expect(source).toContain("hashAdminPassword(password)");
    expect(source).toContain("tenantAdminCredentialState(passwordHash");
  });
  it("revokes tenant sessions and elevations and writes an audit event", () => {
    expect(source).toContain("tx.appSession.updateMany");
    expect(source).toContain("tx.adminElevationSession.updateMany");
    expect(source).toContain("EXISTING_TENANT_ADMIN_BOOTSTRAPPED");
  });
});
