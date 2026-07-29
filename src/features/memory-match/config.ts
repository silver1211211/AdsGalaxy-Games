import type { CardSymbol, LevelConfig } from "./types";

export const SYMBOLS: CardSymbol[] = [
  { id: "apple", emoji: "🍎", label: "Apple" }, { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "target", emoji: "🎯", label: "Target" }, { id: "diamond", emoji: "💎", label: "Diamond" },
  { id: "football", emoji: "⚽", label: "Football" }, { id: "game", emoji: "🎮", label: "Game controller" },
  { id: "star", emoji: "⭐", label: "Star" }, { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "music", emoji: "🎵", label: "Music" }, { id: "pizza", emoji: "🍕", label: "Pizza" },
  { id: "sun", emoji: "☀️", label: "Sun" }, { id: "planet", emoji: "🪐", label: "Planet" }
];

export const LEVELS: LevelConfig[] = [
  { level: 1, rows: 2, columns: 3, cardCount: 6, timeTarget: 25, goodTimeTarget: 38, basePoints: 18, difficulty: "Beginner", maxShuffles: 0, shuffleAfterMismatches: null, shuffleWarningAt: null },
  { level: 2, rows: 2, columns: 4, cardCount: 8, timeTarget: 34, goodTimeTarget: 50, basePoints: 24, difficulty: "Beginner", maxShuffles: 0, shuffleAfterMismatches: null, shuffleWarningAt: null },
  { level: 3, rows: 2, columns: 4, cardCount: 8, timeTarget: 32, goodTimeTarget: 48, basePoints: 30, difficulty: "Easy", maxShuffles: 0, shuffleAfterMismatches: null, shuffleWarningAt: null },
  { level: 4, rows: 2, columns: 5, cardCount: 10, timeTarget: 44, goodTimeTarget: 65, basePoints: 38, difficulty: "Easy", maxShuffles: 0, shuffleAfterMismatches: null, shuffleWarningAt: null },
  { level: 5, rows: 2, columns: 5, cardCount: 10, timeTarget: 42, goodTimeTarget: 62, basePoints: 46, difficulty: "Medium", maxShuffles: 1, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 6, rows: 3, columns: 4, cardCount: 12, timeTarget: 55, goodTimeTarget: 78, basePoints: 54, difficulty: "Medium", maxShuffles: 1, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 7, rows: 3, columns: 4, cardCount: 12, timeTarget: 49, goodTimeTarget: 70, basePoints: 62, difficulty: "Medium", maxShuffles: 1, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 8, rows: 3, columns: 4, cardCount: 12, timeTarget: 48, goodTimeTarget: 70, basePoints: 70, difficulty: "Hard", maxShuffles: 1, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 9, rows: 2, columns: 7, cardCount: 14, timeTarget: 62, goodTimeTarget: 88, basePoints: 78, difficulty: "Hard", maxShuffles: 1, shuffleAfterMismatches: 5, shuffleWarningAt: 4 },
  { level: 10, rows: 2, columns: 7, cardCount: 14, timeTarget: 58, goodTimeTarget: 84, basePoints: 88, difficulty: "Hard", maxShuffles: 1, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 11, rows: 2, columns: 7, cardCount: 14, timeTarget: 56, goodTimeTarget: 80, basePoints: 98, difficulty: "Hard", maxShuffles: 2, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 12, rows: 4, columns: 4, cardCount: 16, timeTarget: 72, goodTimeTarget: 102, basePoints: 108, difficulty: "Hard", maxShuffles: 2, shuffleAfterMismatches: 5, shuffleWarningAt: 4 },
  { level: 13, rows: 4, columns: 4, cardCount: 16, timeTarget: 68, goodTimeTarget: 96, basePoints: 120, difficulty: "Expert", maxShuffles: 2, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 14, rows: 4, columns: 4, cardCount: 16, timeTarget: 62, goodTimeTarget: 90, basePoints: 134, difficulty: "Expert", maxShuffles: 2, shuffleAfterMismatches: 4, shuffleWarningAt: 3 },
  { level: 15, rows: 4, columns: 4, cardCount: 16, timeTarget: 60, goodTimeTarget: 86, basePoints: 150, difficulty: "Expert", maxShuffles: 2, shuffleAfterMismatches: 3, shuffleWarningAt: 2 }
];

export function getLevel(level: number): LevelConfig {
  const config = LEVELS.find((item) => item.level === level);
  if (!config) throw new Error("Unknown Memory Match level");
  return config;
}
