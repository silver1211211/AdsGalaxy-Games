import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireAdmin(),
      { userId } = await params,
      member = await prisma.miniAppMembership.findUnique({
        where: { miniAppId_userId: { miniAppId: a.miniAppId, userId } },
      });
    if (!member)
      return Response.json({ error: "User not found." }, { status: 404 });
    await prisma.$transaction([
      prisma.miniAppMembership.update({
        where: { id: member.id },
        data: { status: "ACTIVE" },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "MEMBERSHIP_RESTORED",
          targetType: "MiniAppMembership",
          targetId: member.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Mini App access restored",
          body: "Your membership is active again.",
        },
      }),
    ]);
    return Response.json({ restored: true });
  } catch (e) {
    return apiError(e, "Could not restore membership.");
  }
}
