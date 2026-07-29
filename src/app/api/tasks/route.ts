import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getTaskSettings } from "@/features/tasks/server";
export async function GET(request: Request) {
  try {
    const a = await requireSession(),
      q = new URL(request.url).searchParams,
      filter = q.get("filter") ?? "AVAILABLE",
      now = new Date(),
      settings = await getTaskSettings(a.miniAppId);
    const tasks = await prisma.task.findMany({
      where: {
        miniAppId: a.miniAppId,
        status: "ACTIVE",
        emergencyDisabled: false,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      include: {
        attempts: {
          where: { userId: a.userId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { featured: "desc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });
    const [wallet, points, pending] = await Promise.all([
      prisma.wallet.findUnique({
        where: {
          miniAppId_userId: { miniAppId: a.miniAppId, userId: a.userId },
        },
      }),
      prisma.pointTransaction.aggregate({
        where: { miniAppId: a.miniAppId, userId: a.userId },
        _sum: { amount: true },
      }),
      prisma.taskSubmission.count({
        where: {
          miniAppId: a.miniAppId,
          userId: a.userId,
          status: { in: ["PENDING_REVIEW", "PENDING_VERIFICATION"] },
        },
      }),
    ]);
    const items = tasks
      .map((t) => ({
        ...t,
        rewardWallet: t.rewardWallet.toFixed(6),
        attempt: t.attempts[0] ?? null,
        questions: undefined,
        attempts: undefined,
      }))
      .filter((t) =>
        filter === "AVAILABLE"
          ? !t.attempt
          : filter === "IN_PROGRESS" && t.attempt
            ? ["STARTED", "DESTINATION_OPENED", "READY_TO_CONFIRM"].includes(
                t.attempt.status,
              )
            : filter === "PENDING" && t.attempt
              ? ["PENDING_REVIEW", "PENDING_VERIFICATION"].includes(
                  t.attempt.status,
                )
              : filter === "COMPLETED" && t.attempt
                ? [
                    "REWARDED",
                    "APPROVED",
                    "VERIFIED",
                    "SELF_CONFIRMED",
                  ].includes(t.attempt.status)
                : true,
      );
    return NextResponse.json({
      enabled: settings.enabled && !settings.emergencyDisabled,
      summary: {
        totalPoints: points._sum.amount ?? 0,
        walletBalance: wallet?.availableBalance.toFixed(6) ?? "0.000000",
        available: tasks.filter((t) => !t.attempts[0]).length,
        inProgress: tasks.filter(
          (t) =>
            t.attempts[0] &&
            ["STARTED", "DESTINATION_OPENED"].includes(t.attempts[0].status),
        ).length,
        pending,
        completedToday: tasks.filter(
          (t) =>
            t.attempts[0]?.rewardedAt &&
            t.attempts[0].rewardedAt.toISOString().slice(0, 10) ===
              now.toISOString().slice(0, 10),
        ).length,
      },
      items,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load tasks" },
      { status: 400 },
    );
  }
}
