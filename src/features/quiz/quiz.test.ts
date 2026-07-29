import { describe, expect, it } from "vitest";
import { adBreakEligible, deterministicShuffle, questionPoints, resultStars, selectQuestions, validateQuestion } from "./engine";
import { buildSeedQuestions } from "./seed-data";

describe("Quiz Challenge content", () => {
  it("ships 100 valid questions with the intended category and difficulty distribution", () => {
    const questions = buildSeedQuestions();
    expect(questions).toHaveLength(100);
    expect(new Set(questions.map(q => q.categorySlug)).size).toBe(10);
    expect(questions.filter(q => q.difficulty === "EASY")).toHaveLength(40);
    expect(questions.filter(q => q.difficulty === "MEDIUM")).toHaveLength(40);
    expect(questions.filter(q => q.difficulty === "HARD")).toHaveLength(20);
    for (const question of questions) expect(() => validateQuestion({ questionText: question.questionText, explanation: question.explanation, options: question.options.map((text, index) => ({ text, correct: index === 0 })) })).not.toThrow();
  });

  it("rejects duplicate answers and multiple correct options", () => {
    expect(() => validateQuestion({ questionText: "Which answer is correct?", explanation: "A useful explanation.", options: [
      { text: "One", correct: true }, { text: "One", correct: false }, { text: "Three", correct: false }, { text: "Four", correct: false }
    ]})).toThrow(/unique/);
  });
});

describe("Quiz Challenge engine", () => {
  it("uses reproducible shuffles and avoids recent questions first", () => {
    expect(deterministicShuffle([1,2,3,4,5], "daily")).toEqual(deterministicShuffle([1,2,3,4,5], "daily"));
    const selected = selectQuestions([{id:"a"},{id:"b"},{id:"c"}], 2, "seed", new Set(["a"]));
    expect(selected.map(q => q.id)).not.toContain("a");
  });

  it("scores time, streak and second chance with integer basis points", () => {
    expect(questionPoints({ basePoints:100, remainingMs:5000, allowedMs:10000, streak:3, maxTimeBonusBps:5000, streakStepBps:1000, maxStreakBonusBps:5000 })).toBe(145);
    expect(questionPoints({ basePoints:100, remainingMs:5000, allowedMs:10000, streak:3, maxTimeBonusBps:5000, streakStepBps:1000, maxStreakBonusBps:5000, secondChance:true })).toBe(73);
  });

  it("assigns stars and enforces ad overload safeguards", () => {
    expect(resultStars(8500, 6000, 10000)).toBe(3);
    expect(resultStars(6500, 9000, 10000)).toBe(2);
    expect(resultStars(3000, 1000, 10000)).toBe(1);
    const base = { answeredPosition:5, configuredPositions:[5], completedAds:0, maxAds:1, sessionSeconds:60, minimumSessionSeconds:30, lastAdSecondsAgo:null, minimumIntervalSeconds:60, lastUtilitySecondsAgo:null, utilityDelaySeconds:30 };
    expect(adBreakEligible(base)).toBe(true);
    expect(adBreakEligible({...base, completedAds:1})).toBe(false);
    expect(adBreakEligible({...base, lastUtilitySecondsAgo:10})).toBe(false);
  });
});
