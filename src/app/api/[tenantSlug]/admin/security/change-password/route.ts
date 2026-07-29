import { z } from "zod";
import { changeOwnAdminPassword } from "@/features/admin-security/credentials";
import { clearAdminElevationCookie, requireRecentAdminElevation } from "@/features/admin-security/elevation";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { requireTenantAdminIdentity } from "@/features/tenant-admin/auth";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
  message: "New password confirmation does not match.",
  path: ["confirmPassword"],
});

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    assertProtectedJsonRequest(request);
    const { tenantSlug } = await params;
    const auth = await requireTenantAdminIdentity(tenantSlug);
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId });
    rateLimit(`admin-password-change:${auth.userId}`, 5, 15 * 60_000);
    const input = schema.parse(await request.json());
    await changeOwnAdminPassword({
      userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId,
      currentPassword: input.currentPassword, newPassword: input.newPassword,
      tenantSlug, miniAppName: auth.miniApp.name, telegramUsername: auth.user.username,
    });
    await clearAdminElevationCookie("TENANT_ADMIN");
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Password could not be changed." }, { status: 422 });
  }
}
