import { z } from "zod";
import { changeOwnAdminPassword } from "@/features/admin-security/credentials";
import { clearAdminElevationCookie, requireRecentAdminElevation } from "@/features/admin-security/elevation";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { requireSuperAdminIdentity } from "@/lib/session";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
}).strict().refine((value) => value.newPassword === value.confirmPassword, { message: "New password confirmation does not match.", path: ["confirmPassword"] });

export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request);
    const auth = await requireSuperAdminIdentity();
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "SUPER_ADMIN" });
    rateLimit(`super-password-change:${auth.userId}`, 5, 15 * 60_000);
    const input = schema.parse(await request.json());
    await changeOwnAdminPassword({
      userId: auth.userId, scopeType: "SUPER_ADMIN",
      currentPassword: input.currentPassword, newPassword: input.newPassword,
      telegramUsername: auth.user.username,
    });
    await clearAdminElevationCookie("SUPER_ADMIN");
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Password could not be changed." }, { status: 422 });
  }
}
