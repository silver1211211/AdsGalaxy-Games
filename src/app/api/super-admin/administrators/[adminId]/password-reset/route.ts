import { z } from "zod";
import { clearAdminCredentialLockout, createTemporaryAdminCredential } from "@/features/admin-security/credentials";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";

const schema = z.object({
  action: z.enum(["RESET", "CLEAR_LOCKOUT"]),
  membershipId: z.string().cuid(),
  reason: z.string().trim().min(10).max(300),
  mode: z.enum(["GENERATE", "MANUAL"]).optional(),
  temporaryPassword: z.string().max(128).optional(),
  confirmPassword: z.string().max(128).optional(),
  confirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.action === "RESET" && value.mode === "MANUAL" && value.temporaryPassword !== value.confirmPassword)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Temporary password confirmation does not match." });
});

export async function POST(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    assertProtectedJsonRequest(request);
    const auth = await requireSuperAdmin();
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "SUPER_ADMIN" });
    rateLimit(`super-admin-password-reset:${auth.userId}`, 5, 15 * 60_000);
    const { adminId } = await params;
    const input = schema.parse(await request.json());
    const membership = await prisma.miniAppMembership.findFirst({
      where: { id: input.membershipId, userId: adminId, role: "ADMIN" },
      include: { miniApp: true },
    });
    if (!membership) return Response.json({ error: "Tenant Administrator was not found." }, { status: 404 });
    if (input.action === "CLEAR_LOCKOUT") {
      await clearAdminCredentialLockout({
        targetUserId: adminId, actorUserId: auth.userId, scopeType: "TENANT_ADMIN",
        miniAppId: membership.miniAppId, reason: input.reason,
      });
      return Response.json({ ok: true });
    }
    const result = await createTemporaryAdminCredential({
      userId: adminId,
      scopeType: "TENANT_ADMIN",
      resetByUserId: auth.userId,
      miniAppId: membership.miniAppId,
      reason: input.reason,
      manualTemporaryPassword: input.mode === "MANUAL" ? input.temporaryPassword : undefined,
    });
    return Response.json({ ok: true, temporaryPassword: result.plaintext });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Administrator password reset failed." }, { status: 422 });
  }
}
