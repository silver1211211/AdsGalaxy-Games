import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  engagementReady,
  taskPeriodKey,
  verificationLabel,
  verifyTaskAnswer,
} from "./engine";
export async function getTaskSettings(miniAppId: string) {
  return prisma.taskSettings.upsert({
    where: { miniAppId },
    create: { miniAppId },
    update: {},
  });
}
export async function startTask(
  miniAppId: string,
  userId: string,
  taskId: string,
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      miniAppId,
      status: "ACTIVE",
      emergencyDisabled: false,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      ],
    },
  });
  if (!task) throw new Error("Task is not available");
  const settings = await getTaskSettings(miniAppId);
  if (!settings.enabled || settings.emergencyDisabled)
    throw new Error("Tasks are unavailable");
  if (
    task.maximumCompletions !== null &&
    task.completionsCount >= task.maximumCompletions
  )
    throw new Error("Task completion limit reached");
  if (
    task.verificationStrength === "REINFORCED_SELF_CONFIRMATION" &&
    task.rewardType !== "POINTS" &&
    task.rewardType !== "NON_FINANCIAL"
  )
    throw new Error("Low-trust tasks cannot issue wallet money");
  const periodKey = taskPeriodKey(task.repeatPolicy);
  return prisma.taskAttempt.upsert({
    where: {
      miniAppId_userId_taskId_periodKey: {
        miniAppId,
        userId,
        taskId,
        periodKey,
      },
    },
    create: {
      miniAppId,
      userId,
      taskId,
      periodKey,
      taskVersion: task.version,
      nonce: crypto.randomUUID(),
      rewardType: task.rewardType,
      rewardPoints: task.rewardPoints,
      rewardWallet: task.rewardWallet,
      minimumEngagementSeconds: task.minimumEngagementSeconds,
      expiresAt: new Date(Date.now() + task.completionWindowMinutes * 60000),
    },
    update: {},
    include: { task: { include: { questions: true } } },
  });
}
export async function issueTaskReward(attemptId: string) {
  return prisma.$transaction(
    async (tx) => {
      const attempt = await tx.taskAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { task: true },
      });
      if (attempt.rewardedAt) return attempt;
      if (!["VERIFIED", "SELF_CONFIRMED", "APPROVED"].includes(attempt.status))
        throw new Error("Task is not eligible for reward");
      if (
        attempt.task.maximumCompletions !== null &&
        attempt.task.completionsCount >= attempt.task.maximumCompletions
      )
        throw new Error("Task completion limit reached");
      const user = await tx.user.findUniqueOrThrow({
          where: { id: attempt.userId },
        }),
        wallet = await tx.wallet.findUniqueOrThrow({
          where: {
            miniAppId_userId: {
              miniAppId: attempt.miniAppId,
              userId: attempt.userId,
            },
          },
        });
      let pointTransactionId: string | undefined,
        walletTransactionId: string | undefined;
      if (
        ["POINTS", "POINTS_AND_WALLET"].includes(attempt.rewardType) &&
        attempt.rewardPoints > 0
      ) {
        const after = user.totalPoints + attempt.rewardPoints,
          t = await tx.pointTransaction.create({
            data: {
              miniAppId: attempt.miniAppId,
              userId: attempt.userId,
              amount: attempt.rewardPoints,
              balanceAfter: after,
              type: "TASK_REWARD",
              referenceId: `task:attempt:${attempt.id}:points`,
              description: `Task Reward · ${attempt.task.title}`,
            },
          });
        await tx.user.update({
          where: { id: user.id },
          data: { totalPoints: after },
        });
        pointTransactionId = t.id;
      }
      if (
        ["WALLET", "POINTS_AND_WALLET"].includes(attempt.rewardType) &&
        attempt.rewardWallet.gt(0)
      ) {
        const after = wallet.availableBalance.add(attempt.rewardWallet),
          t = await tx.walletTransaction.create({
            data: {
              miniAppId: attempt.miniAppId,
              userId: attempt.userId,
              walletId: wallet.id,
              type: "TASK_REWARD",
              status: "COMPLETED",
              amount: attempt.rewardWallet,
              balanceBefore: wallet.availableBalance,
              balanceAfter: after,
              referenceId: `task:attempt:${attempt.id}:wallet`,
              description: `Task Reward · ${attempt.task.title}`,
              completedAt: new Date(),
            },
          });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: after,
            lifetimeEarnings: { increment: attempt.rewardWallet },
          },
        });
        walletTransactionId = t.id;
      }
      await tx.task.update({
        where: { id: attempt.taskId },
        data: {
          completionsCount: { increment: 1 },
          spentBudget: { increment: attempt.rewardWallet },
        },
      });
      await tx.notification.create({
        data: {
          userId: attempt.userId,
          type: "TASK",
          title: "Task reward issued",
          body: `${attempt.task.title} has been rewarded.`,
          data: { attemptId: attempt.id },
        },
      });
      return tx.taskAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "REWARDED",
          rewardedAt: new Date(),
          pointTransactionId,
          walletTransactionId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function submitTask(
  miniAppId: string,
  userId: string,
  attemptId: string,
  answer?: string,
) {
  const attempt = await prisma.taskAttempt.findFirst({
    where: { id: attemptId, miniAppId, userId },
    include: { task: { include: { questions: true } } },
  });
  if (!attempt) throw new Error("Task attempt not found");
  if (attempt.expiresAt <= new Date()) throw new Error("Task attempt expired");
  if (!attempt.destinationOpenedAt && attempt.task.destinationUrl)
    throw new Error("Open the task destination first");
  if (
    !engagementReady(
      attempt.destinationOpenedAt,
      attempt.minimumEngagementSeconds,
    )
  )
    throw new Error("Please complete the task before claiming your reward.");
  const question = attempt.task.questions[0];
  if (question && !answer) throw new Error("Confirmation answer is required");
  if (
    question &&
    !verifyTaskAnswer(
      answer!,
      question.salt,
      question.answerHash,
      question.caseSensitive,
    )
  ) {
    await prisma.taskAttempt.update({
      where: { id: attempt.id },
      data: { confirmationFailures: { increment: 1 } },
    });
    throw new Error("Confirmation answer was not accepted");
  }
  const status =
    attempt.task.verificationStrength === "MANUAL_REVIEW"
      ? "PENDING_REVIEW"
      : attempt.task.verificationStrength === "VERIFIED"
        ? "PENDING_VERIFICATION"
        : "SELF_CONFIRMED";
  await prisma.$transaction([
    prisma.taskAttempt.update({
      where: { id: attempt.id },
      data: { status, submittedAt: new Date() },
    }),
    prisma.taskSubmission.upsert({
      where: { attemptId: attempt.id },
      create: {
        miniAppId,
        userId,
        attemptId: attempt.id,
        status,
        verificationLabel: verificationLabel(
          attempt.task.verificationStrength,
          status,
        ),
        answerText: answer,
      },
      update: {},
    }),
  ]);
  if (status === "SELF_CONFIRMED") return issueTaskReward(attempt.id);
  return prisma.taskAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
}
