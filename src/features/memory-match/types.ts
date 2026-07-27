export type CardSymbol = { id: string; emoji: string; label: string };
export type MemoryCard = CardSymbol & { cardId: string; matched: boolean };
export type LevelConfig = {
  level: number; rows: number; columns: number; timeTarget: number;
  baseReward: number; difficulty: "Easy" | "Medium" | "Hard" | "Expert";
};
export type CompletionInput = {
  level: number; moves: number; elapsedSeconds: number; highestCombo: number;
  matchedPairs: number; score: number;
};
export type GameResult = CompletionInput & {
  stars: 1 | 2 | 3; rewardAmount: number; experience: number; completedAt: string;
};
export type MemoryStats = {
  gamesPlayed: number; gamesWon: number; totalMatches: number; totalSeconds: number;
  totalMoves: number; highestScore: number; fastestWin: number | null; bestCombo: number;
  unlockedAchievements: string[]; highestUnlockedLevel: number;
};
