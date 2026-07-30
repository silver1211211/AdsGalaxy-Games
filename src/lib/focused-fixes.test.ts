import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tenantUrls } from "./tenant-urls";
import { readClientApiError } from "./client-api-error";
import { zodApiError } from "./safe-api-error";
import { z } from "zod";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("focused audit fixes", () => {
  it("generates canonical tenant URLs from one normalized base", () => {
    expect(tenantUrls("silver", "https://games.adsgalaxy.online///")).toEqual({
      public: "https://games.adsgalaxy.online/silver",
      administratorLogin: "https://games.adsgalaxy.online/silver/admin/login",
      administratorDashboard: "https://games.adsgalaxy.online/silver/admin",
    });
  });

  it("uses the canonical URL helper in approval, request detail and tenant detail", () => {
    for (const file of [
      "src/app/api/super-admin/mini-app-requests/[requestId]/approve/route.ts",
      "src/components/public/request-detail.tsx",
      "src/app/super-admin/tenants/[tenantId]/page.tsx",
    ]) expect(source(file)).toContain("tenantUrls(");
  });

  it("describes the website-first flow without obsolete Telegram requirements or timing promises", () => {
    const home = source("src/app/page.tsx");
    expect(home).not.toContain("Open through Telegram");
    expect(home).not.toContain("verified Telegram account");
    expect(home).not.toContain("in Minutes");
    expect(home).toContain("One active free request is allowed per device");
    expect(home).toContain("Administrator login URL");
    expect(home).toContain("optional tenant-specific Telegram");
    expect(home).toContain('href="/terms"');
    expect(home).toContain('href="/privacy"');
    expect(home).toContain("approval is not guaranteed");
  });

  it("removes the public Mini App shortcut and production dev-access guidance", () => {
    expect(source("src/components/tenant-admin/admin-shell.tsx")).not.toContain("View Mini App");
    expect(source("src/components/tenant-admin/general-settings-form.tsx")).not.toContain("/dev/access");
  });

  it("turns Zod failures into a safe string and field map", () => {
    const schema = z.object({ maintenanceMessage: z.string().min(1, "Add a maintenance message before enabling maintenance mode.") });
    const parsed = schema.safeParse({ maintenanceMessage: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodApiError(parsed.error)).toEqual({
      error: "Add a maintenance message before enabling maintenance mode.",
      code: "VALIDATION_ERROR",
      fieldErrors: {
        maintenanceMessage: "Add a maintenance message before enabling maintenance mode.",
      },
    });
    expect(JSON.stringify(zodApiError(parsed.error))).not.toContain('"issues"');
  });

  it("handles malformed administrative API responses safely", async () => {
    expect(
      await readClientApiError(
        new Response("<html>failure</html>", { status: 500 }),
        "Safe fallback.",
      ),
    ).toEqual({ error: "Safe fallback.", fieldErrors: {} });
    expect(String((await readClientApiError(Response.json({ error: {} }), "Safe fallback.")).error)).not.toBe("[object Object]");
  });
});
