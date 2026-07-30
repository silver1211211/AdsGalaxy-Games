import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("public tenant page implementation", () => {
  const source = readFileSync("src/app/[tenantSlug]/page.tsx", "utf8");
  it("resolves the database tenant and never redirects to global games", () => {
    expect(source).toContain("prisma.miniApp.findUnique");
    expect(source).toContain("notFound()");
    expect(source).not.toContain('redirect("/games")');
  });
  it("uses the public image endpoint and safe missing-bot state", () => {
    expect(source).toContain("/api/tenants/");
    expect(source).not.toContain(";base64,");
    expect(source).toContain("Telegram access has not yet been configured");
  });
  it("loads tenant branding and tenant feature settings", () => {
    for (const field of ["logoUrl", "startMessage", "startImageKey", "gameSettings", "taskSettings", "walletSettings", "adConfiguration"])
      expect(source).toContain(field);
  });
});
