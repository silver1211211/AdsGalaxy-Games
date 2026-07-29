import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireSuperAdmin(),
      { userId } = await params,
      result = await prisma.appSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: a.userId,
        action: "GLOBAL_USER_SESSIONS_REVOKED",
        targetType: "User",
        targetId: userId,
        metadata: { count: result.count },
      },
    });
    return Response.json({ revoked: result.count });
  } catch (e) {
    return apiError(e, "Could not revoke sessions.");
  }
}
