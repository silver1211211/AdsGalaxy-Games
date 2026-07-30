import { assertProtectedJsonRequest } from "@/features/profile/security";
import { requireTenantAdminIdentity } from "@/features/tenant-admin/auth";
import { revokeTenantAdministratorSession } from "@/features/tenant-admin/browser-auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    assertProtectedJsonRequest(request, 256);
    const { tenantSlug } = await params;
    const auth = await requireTenantAdminIdentity(tenantSlug);
    await revokeTenantAdministratorSession({
      sessionId: auth.sessionId, userId: auth.userId, miniAppId: auth.miniAppId,
    });
    const response = Response.json({ loggedOut: true, redirect: `/${tenantSlug}/administrator-login` });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    response.headers.append(
      "Set-Cookie",
      `ag_tenant_admin_elevation=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    return error instanceof Response ? error : Response.json({ error: "Logout failed." }, { status: 422 });
  }
}
