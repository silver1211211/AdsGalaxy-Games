import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`export:${auth.userId}`, 2, 86_400_000);
    const existing = await prisma.dataExportRequest.findFirst({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        status: { in: ["PENDING", "PROCESSING", "READY"] },
        expiresAt: { gt: new Date() },
      },
    });
    if (existing)
      return Response.json(
        { id: existing.id, status: existing.status },
        { status: 200 },
      );
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.dataExportRequest.create({
        data: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: "READY",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "DATA_EXPORT_REQUESTED",
          targetType: "DataExportRequest",
          targetId: created.id,
        },
      });
      return created;
    });
    return Response.json({ id: item.id, status: item.status }, { status: 201 });
  } catch (error) {
    return apiError(error, "Data export request failed.");
  }
}
