import { z } from "zod";
import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
const schema = z
  .object({
    action: z.enum(["RESTRICT", "RESTORE"]),
    reason: z.string().trim().min(5).max(300),
  })
  .strict();
export async function POST(
  r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireSuperAdmin(),
      { userId } = await params,
      input = schema.parse(await r.json());
    if (Date.now() - a.appSession.createdAt.getTime() > 30 * 60_000)
      return Response.json(
        { error: "Recent authentication is required.", code: "RECENT_AUTH_REQUIRED" },
        { status: 403 },
      );
    if (userId === a.userId)
      return Response.json(
        { error: "You cannot globally restrict your own account." },
        { status: 409 },
      );
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return Response.json({ error: "User not found." }, { status: 404 });
    const status = input.action === "RESTRICT" ? "BANNED" : "ACTIVE";
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { status } }),
      prisma.appSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.adminAuditLog.create({
        data: {
          actorUserId: a.userId,
          action: `GLOBAL_USER_${input.action}ED`,
          targetType: "User",
          targetId: userId,
          metadata: { reason: input.reason },
        },
      }),
    ]);
    return Response.json({ status });
  } catch (e) {
    return apiError(e, "Could not update global restriction.");
  }
}
