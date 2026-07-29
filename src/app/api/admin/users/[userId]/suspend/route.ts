import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
const schema = z.object({ reason: z.string().trim().min(5).max(300) }).strict();
export async function POST(
  r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireAdmin(),
      { userId } = await params,
      input = schema.parse(await r.json());
    if (userId === a.userId)
      return Response.json(
        { error: "You cannot suspend your own membership." },
        { status: 409 },
      );
    const member = await prisma.miniAppMembership.findUnique({
      where: { miniAppId_userId: { miniAppId: a.miniAppId, userId } },
    });
    if (!member)
      return Response.json({ error: "User not found." }, { status: 404 });
    if (member.role === "SUPER_ADMIN")
      return Response.json(
        { error: "Only Super Admin controls can restrict a Super Admin." },
        { status: 403 },
      );
    await prisma.$transaction([
      prisma.miniAppMembership.update({
        where: { id: member.id },
        data: { status: "SUSPENDED" },
      }),
      prisma.appSession.updateMany({
        where: { miniAppId: a.miniAppId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "MEMBERSHIP_SUSPENDED",
          targetType: "MiniAppMembership",
          targetId: member.id,
          metadata: { reason: input.reason },
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Mini App access suspended",
          body: "Your membership was suspended. Contact support for assistance.",
        },
      }),
    ]);
    return Response.json({ suspended: true });
  } catch (e) {
    return apiError(e, "Could not suspend membership.");
  }
}
