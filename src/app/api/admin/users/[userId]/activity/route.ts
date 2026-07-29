import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const a = await requireAdmin(),
      { userId } = await params,
      member = await prisma.miniAppMembership.findUnique({
        where: { miniAppId_userId: { miniAppId: a.miniAppId, userId } },
      });
    if (!member)
      return Response.json({ error: "User not found." }, { status: 404 });
    const [wallet, points, games, tasks] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { miniAppId: a.miniAppId, userId },
        select: { id: true, type: true, status: true, createdAt: true },
        take: 25,
        orderBy: { createdAt: "desc" },
      }),
      prisma.pointTransaction.findMany({
        where: { miniAppId: a.miniAppId, userId },
        select: { id: true, type: true, createdAt: true },
        take: 25,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memoryMatchAttempt.findMany({
        where: { miniAppId: a.miniAppId, userId, status: "COMPLETED" },
        select: { id: true, level: true, completedAt: true },
        take: 25,
        orderBy: { completedAt: "desc" },
      }),
      prisma.taskAttempt.findMany({
        where: { miniAppId: a.miniAppId, userId },
        select: { id: true, status: true, updatedAt: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return Response.json({ wallet, points, games, tasks });
  } catch (e) {
    return apiError(e, "Could not load activity.");
  }
}
