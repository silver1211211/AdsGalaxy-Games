export type CardKind = "REGULAR" | "MONEY" | "COIN";
export type RewardOption = "NONE" | "EARLY_COIN" | "A" | "B" | "C" | "FINAL";

export type CardSymbol = { id: string; emoji: string; label: string };
export type ServerCard = CardSymbol & {
  cardId: string;
  pairSlot: number;
  kind: CardKind;
  matched: boolean;
};
export type ClientCard = {
  cardId: string;
  pairSlot: number | null;
  kind: CardKind | null;
  emoji: string | null;
  label: string | null;
  revealed: boolean;
  matched: boolean;
};
export type LevelConfig = {
  level: number;
  rows: number;
  columns: number;
  cardCount: number;
  timeTarget: number;
  goodTimeTarget: number;
  basePoints: number;
  difficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert";
  maxShuffles: number;
  shuffleAfterMismatches: number | null;
  shuffleWarningAt: number | null;
};

export type RewardAssignment = {
  option: RewardOption;
  moneyPairs: number;
  coinPairs: number;
};

export type PendingClaim = {
  id: string;
  pairSlot: number;
  rewardType: "MONEY" | "COIN";
  status: string;
  configuredMoneyAmount: string | null;
  issuedMultiplier: number | null;
  nextRetryAt: string | null;
  expiresAt: string;
  retryCount: number;
};

export type AttemptView = {
  id: string;
  level: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED" | "EXPIRED";
  cards: ClientCard[];
  moves: number;
  mismatches: number;
  matchedPairs: number;
  currentCombo: number;
  highestCombo: number;
  shuffleCount: number;
  shuffleWarning: string | null;
  elapsedSeconds: number;
  score: number;
  stars: number | null;
  basePoints: number;
  finalPoints: number;
  assignment: RewardAssignment;
  claims: PendingClaim[];
  version: number;
};

export type LevelProgress = {
  level: number;
  completed: boolean;
  bestScore: number;
  bestStars: number;
};
