import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvedGamePlatformConfig } from "@/features/super-admin/game-platform";
import { modeAdPositions, modeQuestionCount } from "./config";
import { adBreakEligible, questionPoints, resultStars, selectQuestions, snapshotQuestion } from "./engine";
import type { PublicQuestion, QuizModeKey, QuizSessionView } from "./types";

export async function getQuizSettings(miniAppId: string) {
  const [settings,platform]=await Promise.all([prisma.quizSettings.upsert({ where: { miniAppId }, create: { miniAppId }, update: {} }),resolvedGamePlatformConfig("quiz-challenge",miniAppId)]);
  return {...settings,enabled:settings.enabled&&platform.enabled,emergencyDisabled:settings.emergencyDisabled||!platform.enabled,...platform.configuration};
}

function allowedSeconds(difficulty: "EASY" | "MEDIUM" | "HARD", settings: Awaited<ReturnType<typeof getQuizSettings>>) {
  return difficulty === "EASY" ? settings.easyTimeSeconds : difficulty === "MEDIUM" ? settings.mediumTimeSeconds : settings.hardTimeSeconds;
}

export async function createQuizSession(input: { miniAppId: string; userId: string; mode: QuizModeKey; categoryId?: string }) {
  const settings = await getQuizSettings(input.miniAppId);
  const enabled = input.mode === "QUICK" ? settings.quickEnabled : input.mode === "CLASSIC" ? settings.classicEnabled : input.mode === "CATEGORY" ? settings.categoryEnabled : settings.dailyEnabled;
  if (!settings.enabled || !enabled) throw new Error("This Quiz mode is unavailable");
  if (input.mode === "CATEGORY" && !input.categoryId) throw new Error("Choose a category");
  const periodKey = input.mode === "DAILY" ? new Date().toISOString().slice(0, 10) : null;
  if (periodKey) {
    const existing = await prisma.quizSession.findFirst({
      where: { miniAppId: input.miniAppId, userId: input.userId, mode: "DAILY", periodKey, status: { in: ["ACTIVE", "PAUSED", "AD_BREAK"] } },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return existing;
  }
  const active = await prisma.quizSession.findFirst({
    where: { miniAppId: input.miniAppId, userId: input.userId, mode: input.mode, status: { in: ["ACTIVE", "PAUSED", "AD_BREAK"] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (active) return active;
  const count = modeQuestionCount(input.mode, settings);
  const pool = await prisma.quizQuestion.findMany({
    where: {
      status: "PUBLISHED", isActive: true, deletedAt: null,
      OR: [
        ...(settings.useGlobalQuestions ? [{ sourceType: "GLOBAL_DEFAULT" as const }] : []),
        ...(settings.allowCustomQuestions ? [{ ownerMiniAppId: input.miniAppId }] : [])
      ],
      categoryId: input.mode === "CATEGORY" ? input.categoryId : undefined,
      difficulty: input.mode === "QUICK" ? { in: ["EASY", "MEDIUM"] } : undefined
    },
    include: { options: { orderBy: { sortOrder: "asc" } }, category: true }
  });
  const seed = periodKey ? `${input.miniAppId}:${input.userId}:${periodKey}:daily-v1` : crypto.randomUUID();
  const selected = selectQuestions(pool, count, seed);
  const snapshots = selected.map((question, index) => snapshotQuestion(question as Parameters<typeof snapshotQuestion>[0], index + 1, allowedSeconds(question.difficulty, settings), seed));
  return prisma.$transaction(async (tx) => {
    const session = await tx.quizSession.create({
      data: {
        miniAppId: input.miniAppId, userId: input.userId, mode: input.mode, categoryId: input.categoryId,
        periodKey, seed, configSnapshot: JSON.parse(JSON.stringify(settings)), questionStartedAt: new Date(),
        questionAllowedSeconds: snapshots[0].allowedSeconds, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    await tx.quizSessionQuestion.createMany({
      data: snapshots.map((snapshot) => ({ ...snapshot, sessionId: session.id, startedAt: snapshot.position === 1 ? new Date() : null }))
    });
    await tx.quizQuestion.updateMany({ where: { id: { in: selected.map((question) => question.id) } }, data: { timesUsed: { increment: 1 } } });
    if (periodKey) await tx.quizDailyChallenge.upsert({
      where: { miniAppId_userId_periodKey: { miniAppId: input.miniAppId, userId: input.userId, periodKey } },
      create: { miniAppId: input.miniAppId, userId: input.userId, periodKey, questionSetKey: seed },
      update: {}
    });
    return session;
  });
}

export async function serializeQuizSession(id: string): Promise<QuizSessionView> {
  const session = await prisma.quizSession.findUniqueOrThrow({
    where: { id }, include: { questions: { orderBy: { position: "asc" } } }
  });
  const current = session.questions.find((question) => question.position === session.currentPosition);
  const options = (current?.optionsSnapshot ?? []) as Array<{ key: string; text: string }>;
  const removed = (current?.removedOptionKeys ?? []) as string[];
  const question: PublicQuestion | null = current && !current.answeredAt ? {
    position: current.position, text: current.questionText, category: current.categoryName, difficulty: current.difficulty,
    options: options.map((option) => ({ ...option, removed: removed.includes(option.key) })),
    allowedSeconds: current.allowedSeconds, startedAt: (current.startedAt ?? session.questionStartedAt ?? session.startedAt).toISOString(),
    removedOptionKeys: removed
  } : null;
  const accuracyBps = Math.round(session.correctCount * 10000 / Math.max(1, session.correctCount + session.incorrectCount + session.timeoutCount));
  return {
    id: session.id, mode: session.mode, status: session.status, currentPosition: session.currentPosition,
    questionCount: session.questions.length, score: session.score, correctCount: session.correctCount,
    incorrectCount: session.incorrectCount, timeoutCount: session.timeoutCount, currentStreak: session.currentStreak,
    bestStreak: session.bestStreak, version: session.version, question,
    adBreak: { due: session.status === "AD_BREAK", position: session.status === "AD_BREAK" ? session.currentPosition - 1 : null, configuredAmount: null },
    utilities: { fiftyFifty: session.fiftyFiftyUsed, extraTime: session.extraTimeUsed, secondChance: session.secondChanceUsed, doublePoints: session.doublePointsUsed },
    result: session.status === "COMPLETED" ? { points: session.finalPoints, stars: session.stars ?? 1, accuracyBps } : null
  };
}

export async function answerQuestion(input: { sessionId: string; miniAppId: string; userId: string; optionKey?: string; version: number }) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.quizSession.findFirstOrThrow({
      where: { id: input.sessionId, miniAppId: input.miniAppId, userId: input.userId },
      include: { questions: { orderBy: { position: "asc" } } }
    });
    if (session.status !== "ACTIVE" || session.version !== input.version) throw new Error(session.version !== input.version ? "STALE_VERSION" : "Session is not active");
    const question = session.questions.find((item) => item.position === session.currentPosition);
    if (!question || question.answeredAt) throw new Error("Question already answered");
    const startedAt = question.startedAt ?? session.questionStartedAt ?? session.startedAt;
    const responseMs = Math.max(0, Date.now() - startedAt.getTime());
    const timedOut = responseMs > question.allowedSeconds * 1000;
    const correct = !timedOut && input.optionKey === question.correctOptionKey;
    const settings = await tx.quizSettings.findUniqueOrThrow({ where: { miniAppId: session.miniAppId } });
    const nextStreak = correct ? session.currentStreak + 1 : 0;
    const base = question.difficulty === "EASY" ? settings.easyBasePoints : question.difficulty === "MEDIUM" ? settings.mediumBasePoints : settings.hardBasePoints;
    const earned = correct ? questionPoints({
      basePoints: base, remainingMs: Math.max(0, question.allowedSeconds * 1000 - responseMs),
      allowedMs: question.allowedSeconds * 1000, streak: nextStreak, maxTimeBonusBps: settings.maxTimeBonusBps,
      streakStepBps: settings.streakStepBps, maxStreakBonusBps: settings.maxStreakBonusBps, secondChance: question.secondChance
    }) : 0;
    await tx.quizSessionQuestion.update({
      where: { id: question.id }, data: {
        selectedOptionKey: timedOut ? null : input.optionKey, answeredAt: new Date(), responseMs, isCorrect: correct,
        timedOut, pointsEarned: earned, version: { increment: 1 }
      }
    });
    if (question.questionId) {
      const original = await tx.quizQuestion.findUnique({ where: { id: question.questionId } });
      if (original) {
        const total = original.timesAnswered + 1;
        await tx.quizQuestion.update({ where: { id: original.id }, data: {
          timesAnswered: total, timesCorrect: { increment: correct ? 1 : 0 },
          averageResponseMs: Math.round((original.averageResponseMs * original.timesAnswered + responseMs) / total)
        } });
      }
    }
    const finalQuestion = session.currentPosition >= session.questions.length;
    const positions = modeAdPositions(session.mode, settings);
    const breakDue = !finalQuestion && adBreakEligible({
      answeredPosition: session.currentPosition, configuredPositions: positions,
      completedAds: session.scheduledAdsCompleted, maxAds: settings.maxScheduledAdsSession,
      sessionSeconds: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
      minimumSessionSeconds: settings.minSessionBeforeAdSeconds,
      lastAdSecondsAgo: session.lastAdCompletedAt ? Math.floor((Date.now() - session.lastAdCompletedAt.getTime()) / 1000) : null,
      minimumIntervalSeconds: settings.minAdIntervalSeconds, lastUtilitySecondsAgo: null, utilityDelaySeconds: settings.utilityDelaySeconds
    });
    const nextPosition = finalQuestion ? session.currentPosition : session.currentPosition + 1;
    await tx.quizSession.update({
      where: { id: session.id }, data: {
        score: { increment: earned }, correctCount: { increment: correct ? 1 : 0 },
        incorrectCount: { increment: !correct && !timedOut ? 1 : 0 }, timeoutCount: { increment: timedOut ? 1 : 0 },
        currentStreak: nextStreak, bestStreak: Math.max(session.bestStreak, nextStreak), currentPosition: nextPosition,
        status: breakDue ? "AD_BREAK" : "ACTIVE", scheduledAdsDue: { increment: breakDue ? 1 : 0 },
        questionStartedAt: finalQuestion || breakDue ? null : new Date(),
        questionAllowedSeconds: finalQuestion || breakDue ? null : session.questions[nextPosition - 1].allowedSeconds,
        version: { increment: 1 }
      }
    });
    if (!finalQuestion && !breakDue) await tx.quizSessionQuestion.update({ where: { id: session.questions[nextPosition - 1].id }, data: { startedAt: new Date() } });
    const options = question.optionsSnapshot as Array<{ key: string; text: string }>;
    return {
      feedback: {
        correct, timedOut, selectedOptionKey: timedOut ? null : input.optionKey,
        correctOptionKey: question.correctOptionKey, correctAnswer: options.find((option) => option.key === question.correctOptionKey)?.text,
        explanation: settings.explanationsEnabled ? question.explanation : null, pointsEarned: earned
      },
      sessionId: session.id, finalQuestion
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function completeQuizSession(sessionId: string, miniAppId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.quizSession.findFirstOrThrow({ where: { id: sessionId, miniAppId, userId }, include: { questions: true } });
    if (session.status === "COMPLETED") return session;
    if (session.questions.some((question) => !question.answeredAt)) throw new Error("Quiz is incomplete");
    const settings = await tx.quizSettings.findUniqueOrThrow({ where: { miniAppId } });
    const accuracyBps = Math.round(session.correctCount * 10000 / session.questions.length);
    const averageResponseMs = Math.round(session.questions.reduce((sum, question) => sum + (question.responseMs ?? question.allowedSeconds * 1000), 0) / session.questions.length);
    const averageAllowedMs = Math.round(session.questions.reduce((sum, question) => sum + question.allowedSeconds * 1000, 0) / session.questions.length);
    const bonus = (session.mode === "DAILY" ? settings.dailyCompletionBonus : 0) + (session.correctCount === session.questions.length ? settings.perfectScoreBonus : 0);
    const finalPoints = Math.max(settings.minimumCompletionPoints, session.score + bonus);
    const stars = resultStars(accuracyBps, averageResponseMs, averageAllowedMs);
    const existing = await tx.pointTransaction.findUnique({ where: { quizSessionId: session.id } });
    if (!existing) {
      const aggregate = await tx.pointTransaction.aggregate({ where: { miniAppId, userId }, _sum: { amount: true } });
      await tx.pointTransaction.create({
        data: {
          miniAppId, userId, quizSessionId: session.id, amount: finalPoints, balanceAfter: (aggregate._sum.amount ?? 0) + finalPoints,
          type: "GAME_REWARD", referenceId: `quiz:session:${session.id}:points`,
          description: `Quiz Challenge Points · ${session.mode}`, metadata: { base: session.score, bonus, final: finalPoints }
        }
      });
    }
    if (session.mode === "DAILY" && session.periodKey) await tx.quizDailyChallenge.update({
      where: { miniAppId_userId_periodKey: { miniAppId, userId, periodKey: session.periodKey } },
      data: { firstCompletedAt: session.completedAt ?? new Date(), bestScore: { set: Math.max(session.finalPoints, finalPoints) }, bestAccuracyBps: { set: accuracyBps } }
    });
    return tx.quizSession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: new Date(), finalPoints, stars, version: { increment: 1 } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
