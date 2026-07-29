export const CATCH_RUSH_LEVELS = Array.from({ length: 10 }, (_, index) => {
  const level = index + 1;
  return {
    level,
    label: `Level ${level}`,
    eventCount: 7 + level,
    fallDurationMs: 6800 - level * 390,
    spawnIntervalMs: 2100 - level * 125,
    simultaneousCap: level < 3 ? 1 : level < 6 ? 2 : 3,
    moneyCap: level < 3 ? 1 : level < 7 ? 2 : 3,
  };
});

export const CATCH_RUSH_DISTRIBUTION = { coin: 35, money: 15, bomb: 5, standard: 45 } as const;
export const CATCH_RUSH_ITEMS = [
  { key: "gem", label: "Gem", itemType: "GEM", glyph: "💎" },
  { key: "star", label: "Star", itemType: "STAR", glyph: "⭐" },
  { key: "gift", label: "Gift", itemType: "SPONSORED_CRATE", glyph: "🎁" },
] as const;
export function levelConfig(level: number) {
  return CATCH_RUSH_LEVELS[Math.max(1, Math.min(10, level)) - 1];
}
// Historical mode values remain valid. CLASSIC is Level Journey's internal compatibility value.
export const TAP_MODES = { CLASSIC: { label: "Level Journey", waves: 1, seconds: 0, scheduledAds: [], crates: 0, difficulty: "Progressive" } };
export type TapModeKey = "CLASSIC";
