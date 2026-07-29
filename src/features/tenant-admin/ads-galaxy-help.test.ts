import { describe, expect, it, vi } from "vitest";
import {
  ADS_GALAXY_BOT_URL,
  ADS_GALAXY_HELP_STEPS,
  openAdsGalaxyBot,
} from "./ads-galaxy-help";

describe("Ads Galaxy Mini App ID guide", () => {
  it("contains all six truthful setup steps", () => {
    expect(ADS_GALAXY_HELP_STEPS).toHaveLength(6);
    expect(ADS_GALAXY_HELP_STEPS.map((step) => step.title)).toEqual([
      "Open the Ads Galaxy Bot",
      "Add Your Mini App",
      "Submit for Approval",
      "Copy Your Mini App ID",
      "Save the ID",
      "How Earnings Work",
    ]);
    const guide = ADS_GALAXY_HELP_STEPS.map((step) => step.text).join(" ");
    expect(guide).toContain("reviewed and approved");
    expect(guide).toContain("One shared Ads Galaxy Mini App ID");
    expect(guide).not.toMatch(/guaranteed earnings|every ad earns/i);
  });

  it("uses the centralized official Ads Galaxy bot URL", () => {
    expect(ADS_GALAXY_BOT_URL).toBe("https://t.me/Ads_Galaxy_Bot");
  });

  it("uses Telegram-safe opening when available", () => {
    const openTelegramLink = vi.fn();
    const open = vi.fn();
    expect(
      openAdsGalaxyBot({
        Telegram: { WebApp: { openTelegramLink } },
        open,
      }),
    ).toBe("telegram");
    expect(openTelegramLink).toHaveBeenCalledWith(ADS_GALAXY_BOT_URL);
    expect(open).not.toHaveBeenCalled();
  });

  it("uses a non-replacing browser fallback", () => {
    const open = vi.fn();
    expect(openAdsGalaxyBot({ open })).toBe("browser");
    expect(open).toHaveBeenCalledWith(
      ADS_GALAXY_BOT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });
});
