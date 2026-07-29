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
    rateLimit(`sessions:${auth.userId}`);
    const result = await prisma.appSession.updateMany({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        id: { not: auth.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await prisma.adminAuditLog.create({
      data: {
        miniAppId: auth.miniAppId,
        actorUserId: auth.userId,
        action: "OTHER_APP_SESSIONS_REVOKED",
        targetType: "User",
        targetId: auth.userId,
        metadata: { count: result.count },
      },
    });
    return Response.json({ revoked: result.count });
  } catch (error) {
    return apiError(error, "Could not revoke other sessions.");
  }
}
