import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";

export async function GET(request: Request) {
  try {
    const auth = await requireSession();
    const take = Math.min(
      50,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 20)),
    );
    const [audit, wallet, points, games, tasks] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where: { miniAppId: auth.miniAppId, actorUserId: auth.userId },
        take,
        orderBy: { createdAt: "desc" },
        select: { id: true, action: true, createdAt: true },
      }),
      prisma.walletTransaction.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        take,
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, status: true, createdAt: true },
      }),
      prisma.pointTransaction.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        take,
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, createdAt: true },
      }),
      prisma.memoryMatchAttempt.findMany({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: "COMPLETED",
        },
        take,
        orderBy: { completedAt: "desc" },
        select: { id: true, level: true, completedAt: true },
      }),
      prisma.taskAttempt.findMany({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: { in: ["VERIFIED", "APPROVED", "REWARDED"] },
        },
        take,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          task: { select: { title: true } },
        },
      }),
    ]);
    const items = [
      ...audit.map((x) => ({
        id: `audit-${x.id}`,
        type: "ACCOUNT",
        label: x.action.replaceAll("_", " "),
        at: x.createdAt,
      })),
      ...wallet.map((x) => ({
        id: `wallet-${x.id}`,
        type: "WALLET",
        label: `${x.type.replaceAll("_", " ")} · ${x.status}`,
        at: x.createdAt,
      })),
      ...points.map((x) => ({
        id: `points-${x.id}`,
        type: "POINTS",
        label: x.type.replaceAll("_", " "),
        at: x.createdAt,
      })),
      ...games.map((x) => ({
        id: `game-${x.id}`,
        type: "GAME",
        label: `Memory Match level ${x.level} completed`,
        at: x.completedAt!,
      })),
      ...tasks.map((x) => ({
        id: `task-${x.id}`,
        type: "TASK",
        label: `${x.task.title} · ${x.status}`,
        at: x.updatedAt,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, take);
    return Response.json(
      { items },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, "Could not load account activity.");
  }
}
