import { requireSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`sessions:${auth.userId}`);
    const { sessionId } = await params;
    const result = await prisma.appSession.updateMany({
      where: {
        id: sessionId,
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      return Response.json(
        { error: "Session not found or already revoked." },
        { status: 404 },
      );
    await prisma.adminAuditLog.create({
      data: {
        miniAppId: auth.miniAppId,
        actorUserId: auth.userId,
        action: "APP_SESSION_REVOKED",
        targetType: "AppSession",
        targetId: sessionId,
      },
    });
    const response = Response.json({
      revoked: true,
      current: sessionId === auth.sessionId,
    });
    if (sessionId === auth.sessionId)
      response.headers.append(
        "Set-Cookie",
        `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      );
    return response;
  } catch (error) {
    return apiError(error, "Session revocation failed.");
  }
}
