import type { QuizModeKey } from "./types";

export const QUIZ_MODES: Record<QuizModeKey, {
  title: string; description: string; defaultCount: number; duration: string; difficulty: string; adPositions: number[];
}> = {
  QUICK: { title: "Quick Play", description: "Five fast mixed questions.", defaultCount: 5, duration: "2–3 min", difficulty: "Easy · Medium", adPositions: [3] },
  CLASSIC: { title: "Classic Quiz", description: "A complete mixed-category challenge.", defaultCount: 10, duration: "4–6 min", difficulty: "Easy · Medium · Hard", adPositions: [5, 8] },
  CATEGORY: { title: "Category Challenge", description: "Ten questions from one category.", defaultCount: 10, duration: "4–5 min", difficulty: "Progressive", adPositions: [5] },
  DAILY: { title: "Daily Challenge", description: "Your fixed question set for today.", defaultCount: 10, duration: "4–5 min", difficulty: "Mixed", adPositions: [5] }
};

export function modeQuestionCount(mode: QuizModeKey, settings: {
  quickQuestionCount: number; classicQuestionCount: number; categoryQuestionCount: number; dailyQuestionCount: number;
}) {
  return mode === "QUICK" ? settings.quickQuestionCount : mode === "CLASSIC" ? settings.classicQuestionCount
    : mode === "CATEGORY" ? settings.categoryQuestionCount : settings.dailyQuestionCount;
}

export function modeAdPositions(mode: QuizModeKey, settings: {
  quickAdPosition: number; classicAdPosition1: number; classicAdPosition2: number | null;
  categoryAdPosition: number; dailyAdPosition: number; maxScheduledAdsSession: number;
}) {
  const positions = mode === "QUICK" ? [settings.quickAdPosition]
    : mode === "CLASSIC" ? [settings.classicAdPosition1, settings.classicAdPosition2].filter((value): value is number => value !== null)
    : mode === "CATEGORY" ? [settings.categoryAdPosition] : [settings.dailyAdPosition];
  return positions.slice(0, settings.maxScheduledAdsSession);
}
