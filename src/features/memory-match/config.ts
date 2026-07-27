import type { CardSymbol, LevelConfig } from "./types";

export const SYMBOLS: CardSymbol[] = [
  { id: "apple", emoji: "🍎", label: "Apple" }, { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "target", emoji: "🎯", label: "Target" }, { id: "diamond", emoji: "💎", label: "Diamond" },
  { id: "football", emoji: "⚽", label: "Football" }, { id: "game", emoji: "🎮", label: "Game controller" },
  { id: "star", emoji: "⭐", label: "Star" }, { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "music", emoji: "🎵", label: "Music" }, { id: "pizza", emoji: "🍕", label: "Pizza" },
  { id: "sun", emoji: "☀️", label: "Sun" }, { id: "planet", emoji: "🪐", label: "Planet" },
  { id: "cherry", emoji: "🍒", label: "Cherries" }, { id: "lightning", emoji: "⚡", label: "Lightning" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly" }, { id: "crown", emoji: "👑", label: "Crown" },
  { id: "flower", emoji: "🌸", label: "Flower" }, { id: "robot", emoji: "🤖", label: "Robot" }
];

export const LEVELS: LevelConfig[] = [
  { level: 1, rows: 2, columns: 3, timeTarget: 28, baseReward: 12, difficulty: "Easy" },
  { level: 2, rows: 3, columns: 4, timeTarget: 55, baseReward: 20, difficulty: "Easy" },
  { level: 3, rows: 4, columns: 4, timeTarget: 80, baseReward: 30, difficulty: "Medium" },
  { level: 4, rows: 4, columns: 5, timeTarget: 110, baseReward: 42, difficulty: "Hard" },
  { level: 5, rows: 5, columns: 6, timeTarget: 170, baseReward: 60, difficulty: "Expert" }
];

export const DAILY_CHALLENGE = {
  id: "memory-speed-level-3", level: 3, targetSeconds: 90,
  title: "Quick thinker", description: "Complete Level 3 in under 90 seconds."
} as const;

export function getLevel(level: number): LevelConfig {
  return LEVELS.find((item) => item.level === level) ?? LEVELS[0];
}
