export type QuizModeKey = "QUICK" | "CLASSIC" | "CATEGORY" | "DAILY";
export type QuizDifficultyKey = "EASY" | "MEDIUM" | "HARD";
export type PublicOption = { key: string; text: string; removed?: boolean };
export type PublicQuestion = {
  position: number; text: string; category: string; difficulty: QuizDifficultyKey;
  options: PublicOption[]; allowedSeconds: number; startedAt: string; removedOptionKeys: string[];
};
export type QuizSessionView = {
  id: string; mode: QuizModeKey; status: string; currentPosition: number; questionCount: number;
  score: number; correctCount: number; incorrectCount: number; timeoutCount: number;
  currentStreak: number; bestStreak: number; version: number; question: PublicQuestion | null;
  adBreak: { due: boolean; position: number | null; configuredAmount: string | null };
  utilities: { fiftyFifty: number; extraTime: number; secondChance: number; doublePoints: number };
  result: null | { points: number; stars: number; accuracyBps: number };
};
