import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
const popup = readFileSync(join(process.cwd(), "src/components/system/platform-popup.tsx"), "utf8");

describe("mobile form and popup behavior", () => {
  it("prevents focus zoom with 16px controls without disabling pinch zoom", () => {
    expect(globals).toContain("font-size: 16px !important");
    expect(layout).toContain('width: "device-width"');
    expect(layout).not.toContain("userScalable");
    expect(layout).not.toContain("maximumScale");
  });
  it("constrains custom popups to the viewport with scrollable content", () => {
    expect(popup).toContain("max-h-[calc(100dvh-1rem)]");
    expect(popup).toContain("overflow-y-auto");
    expect(popup).toContain("w-[min(30rem,calc(100%-1rem))]");
  });
});
