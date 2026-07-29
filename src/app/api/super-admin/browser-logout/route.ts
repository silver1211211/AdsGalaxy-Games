import { assertProtectedJsonRequest } from "@/features/profile/security";
import { requireSuperAdminIdentity, SESSION_COOKIE_NAME } from "@/lib/session";
import {
  revokeSuperAdminBrowserSession,
} from "@/features/super-admin/browser-auth";

export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request, 256);
    const auth = await requireSuperAdminIdentity();
    await revokeSuperAdminBrowserSession({
      sessionId: auth.sessionId,
      userId: auth.userId,
    });
    const response = Response.json({
      loggedOut: true,
      redirect: "/super-admin-login",
    });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json({ error: "Logout failed." }, { status: 422 });
  }
}
