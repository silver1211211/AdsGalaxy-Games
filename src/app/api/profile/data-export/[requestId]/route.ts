import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { safeProfile } from "@/features/profile/server";
import { apiError } from "@/features/profile/security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const auth = await requireSession();
    const { requestId } = await params;
    const item = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        status: "READY",
        expiresAt: { gt: new Date() },
      },
    });
    if (!item)
      return Response.json(
        { error: "Export not found or expired." },
        { status: 404 },
      );
    const [profile, points, wallet, tasks, memory, quiz, tap] =
      await Promise.all([
        safeProfile(auth.miniAppId, auth.userId),
        prisma.pointTransaction.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            amount: true,
            type: true,
            description: true,
            createdAt: true,
          },
        }),
        prisma.walletTransaction.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            type: true,
            status: true,
            amount: true,
            currency: true,
            description: true,
            createdAt: true,
          },
        }),
        prisma.taskAttempt.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            status: true,
            createdAt: true,
            updatedAt: true,
            task: { select: { title: true } },
          },
        }),
        prisma.memoryMatchAttempt.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            level: true,
            status: true,
            finalPoints: true,
            stars: true,
            createdAt: true,
          },
        }),
        prisma.quizSession.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            mode: true,
            status: true,
            score: true,
            correctCount: true,
            createdAt: true,
          },
        }),
        prisma.tapCollectorSession.findMany({
          where: { miniAppId: auth.miniAppId, userId: auth.userId },
          select: {
            mode: true,
            status: true,
            score: true,
            collectedCount: true,
            createdAt: true,
          },
        }),
      ]);
    const body = JSON.stringify(
      {
        exportedAt: new Date(),
        profile,
        ledgers: { points, wallet },
        tasks,
        games: { memory, quiz, tap },
      },
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ads-galaxy-profile-export-${item.id}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Could not create data export.");
  }
}
