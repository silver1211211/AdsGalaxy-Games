import { requireSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    await prisma.appSession.updateMany({
      where: { id: auth.sessionId, userId: auth.userId },
      data: { revokedAt: new Date() },
    });
    const redirect = auth.source === "DEVELOPMENT" ? "/dev/access" : "/";
    const response = Response.json({ loggedOut: true, redirect });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    return apiError(error, "Logout failed.");
  }
}
