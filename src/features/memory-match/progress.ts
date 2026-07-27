import type { GameResult, MemoryStats } from "./types";

const KEY = "ads-galaxy:memory-match:v1";
export const DEFAULT_STATS: MemoryStats = {
  gamesPlayed: 0, gamesWon: 0, totalMatches: 0, totalSeconds: 0, totalMoves: 0,
  highestScore: 0, fastestWin: null, bestCombo: 0, unlockedAchievements: [], highestUnlockedLevel: 1
};

const ACHIEVEMENTS = [
  { id: "first-match", test: (s: MemoryStats) => s.totalMatches >= 1 },
  { id: "century", test: (s: MemoryStats) => s.totalMatches >= 100 },
  { id: "perfect-game", test: (_: MemoryStats, r: GameResult) => r.stars === 3 },
  { id: "ten-games", test: (s: MemoryStats) => s.gamesPlayed >= 10 },
  { id: "combo-master", test: (s: MemoryStats) => s.bestCombo >= 5 },
  { id: "speed-runner", test: (_: MemoryStats, r: GameResult) => r.elapsedSeconds <= 45 && r.level >= 2 }
];

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  "first-match": "First Match", century: "100 Matches", "perfect-game": "Perfect Game",
  "ten-games": "10 Games Played", "combo-master": "Combo Master", "speed-runner": "Speed Runner"
};

export function loadStats(): MemoryStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try { return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return DEFAULT_STATS; }
}

export function recordResult(result: GameResult) {
  const current = loadStats();
  const next: MemoryStats = {
    ...current,
    gamesPlayed: current.gamesPlayed + 1, gamesWon: current.gamesWon + 1,
    totalMatches: current.totalMatches + result.matchedPairs,
    totalSeconds: current.totalSeconds + result.elapsedSeconds,
    totalMoves: current.totalMoves + result.moves,
    highestScore: Math.max(current.highestScore, result.score),
    fastestWin: current.fastestWin === null ? result.elapsedSeconds : Math.min(current.fastestWin, result.elapsedSeconds),
    bestCombo: Math.max(current.bestCombo, result.highestCombo),
    highestUnlockedLevel: Math.min(5, Math.max(current.highestUnlockedLevel, result.level + 1))
  };
  const newlyUnlocked = ACHIEVEMENTS.filter((achievement) =>
    !current.unlockedAchievements.includes(achievement.id) && achievement.test(next, result)
  ).map((achievement) => achievement.id);
  next.unlockedAchievements = [...current.unlockedAchievements, ...newlyUnlocked];
  localStorage.setItem(KEY, JSON.stringify(next));
  return { stats: next, newlyUnlocked };
}
