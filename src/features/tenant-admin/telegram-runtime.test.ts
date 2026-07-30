import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  detectTelegramRuntime,
  emptyTelegramRuntimeSnapshot,
  type TelegramRuntimeSnapshot,
} from "./telegram-runtime";
import { miniAppSlugForPath, telegramTenantContextMatches } from "./tenant-launch";

function snapshot(
  input: Partial<TelegramRuntimeSnapshot> = {},
): TelegramRuntimeSnapshot {
  return { ...emptyTelegramRuntimeSnapshot(), ...input };
}

describe("Telegram Desktop runtime detection", () => {
  it("detects a WebApp and signed initData that appear after mount", async () => {
    const states = [
      snapshot(),
      snapshot({ sdkDetected: true, webAppDetected: true }),
      snapshot({
        sdkDetected: true,
        webAppDetected: true,
        signedInitDataPresent: true,
        initDataLength: 128,
        initData: "signed-data",
      }),
    ];
    const observed: TelegramRuntimeSnapshot[] = [];
    const result = await detectTelegramRuntime({
      inspect: () => states.shift() ?? states.at(-1) ?? snapshot({
        sdkDetected: true,
        webAppDetected: true,
        signedInitDataPresent: true,
        initDataLength: 128,
        initData: "signed-data",
      }),
      wait: async () => undefined,
      windowMs: 100,
      intervalMs: 25,
      onSnapshot: (value) => observed.push(value),
    });
    expect(observed[0]?.signedInitDataPresent).toBe(false);
    expect(result.signedInitDataPresent).toBe(true);
    expect(result.initData).toBe("signed-data");
  });

  it("resolves SDK-without-initData and ordinary Telegram browser as browser candidates only after the bound", async () => {
    let inspections = 0;
    const result = await detectTelegramRuntime({
      inspect: () => {
        inspections += 1;
        return snapshot({ sdkDetected: true, webAppDetected: true });
      },
      wait: async () => undefined,
      windowMs: 100,
      intervalMs: 25,
    });
    expect(result.signedInitDataPresent).toBe(false);
    expect(inspections).toBe(5);
  });

  it("uses silver from /silver and accepts absent or matching signed start_param only", () => {
    expect(miniAppSlugForPath("/silver", "ads-galaxy")).toBe("silver");
    expect(telegramTenantContextMatches("silver")).toBe(true);
    expect(telegramTenantContextMatches("silver", "silver")).toBe(true);
    expect(telegramTenantContextMatches("silver", "ads-galaxy")).toBe(false);
  });

  it("posts signed initData with the route tenant and rechecks the bound session", () => {
    const provider = readFileSync(
      "src/components/providers/telegram-provider.tsx",
      "utf8",
    );
    expect(provider).toContain("initData: detected.initData");
    expect(provider).toContain("miniAppSlug: routeSlug");
    expect(provider.split('fetch("/api/auth/session"').length - 1).toBe(2);
    expect(provider).toContain("setRetryNonce");
    expect(provider).not.toContain("miniAppSlug: platformMiniAppSlug");
  });

  it("keeps diagnostics non-sensitive and does not render them", () => {
    const runtime = readFileSync(
      "src/features/tenant-admin/telegram-runtime.ts",
      "utf8",
    );
    const panel = readFileSync(
      "src/components/public/tenant-launch-panel.tsx",
      "utf8",
    );
    for (const safeField of [
      "sdkDetected",
      "webAppDetected",
      "signedInitDataPresent",
      "initDataLength",
      "startParamPresent",
      "routeTenantSlug",
      "providerPhase",
      "authenticationAttempted",
      "authenticatedTenantSlug",
      "authenticationErrorCode",
    ]) expect(runtime).toContain(safeField);
    expect(panel).not.toContain("diagnostics");
  });

  it("loads the Telegram SDK before interactive hydration", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain("https://telegram.org/js/telegram-web-app.js");
    expect(layout).toContain('strategy="beforeInteractive"');
  });
});
