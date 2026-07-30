import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tenant Administrator browser login", () => {
  const source = readFileSync("src/components/tenant-admin/browser-login-form.tsx", "utf8");
  it("renders the tenant name, password, and Secure Sign In", () => {
    expect(source).toContain("tenantName");
    expect(source).toContain('type="password"');
    expect(source).toContain("Secure Sign In");
  });
  it("submits only the password and no browser-supplied identity or role", () => {
    expect(source).toContain("JSON.stringify({ password })");
    expect(source).not.toContain("telegramId");
    expect(source).not.toContain("membershipId");
    expect(source).not.toContain("role:");
  });
});
