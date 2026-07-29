import { z } from "zod";
import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
const schema = z
  .object({ role: z.enum(["USER", "ADMIN"]) })
  .strict();
export async function POST(
  r: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireSuperAdmin(),
      { membershipId } = await params,
      input = schema.parse(await r.json()),
      member = await prisma.miniAppMembership.findUnique({
        where: { id: membershipId },
      });
    if (!member)
      return Response.json({ error: "Membership not found." }, { status: 404 });
    await prisma.$transaction([
      prisma.miniAppMembership.update({
        where: { id: membershipId },
        data: { role: input.role },
      }),
      prisma.appSession.updateMany({
        where: { membershipId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: member.miniAppId,
          actorUserId: a.userId,
          action: "MEMBERSHIP_ROLE_CHANGED",
          targetType: "MiniAppMembership",
          targetId: membershipId,
          before: { role: member.role },
          after: { role: input.role },
        },
      }),
    ]);
    return Response.json({ role: input.role, sessionsRevoked: true });
  } catch (e) {
    return apiError(e, "Could not update role.");
  }
}
