import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, assertSameOrigin } from "@/features/profile/security";
const schema = z.object({ body: z.string().trim().min(2).max(1000) }).strict();
async function member(miniAppId: string, userId: string) {
  return prisma.miniAppMembership.findUnique({
    where: { miniAppId_userId: { miniAppId, userId } },
  });
}
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const a = await requireAdmin(),
      { userId } = await params;
    if (!(await member(a.miniAppId, userId)))
      return Response.json({ error: "User not found." }, { status: 404 });
    return Response.json({
      items: await prisma.adminUserNote.findMany({
        where: { miniAppId: a.miniAppId, userId },
        select: { id: true, body: true, createdAt: true, authorUserId: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  } catch (e) {
    return apiError(e, "Could not load notes.");
  }
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(r);
    const a = await requireAdmin(),
      { userId } = await params,
      input = schema.parse(await r.json());
    if (!(await member(a.miniAppId, userId)))
      return Response.json({ error: "User not found." }, { status: 404 });
    const note = await prisma.$transaction(async (tx) => {
      const n = await tx.adminUserNote.create({
        data: {
          miniAppId: a.miniAppId,
          userId,
          authorUserId: a.userId,
          body: input.body,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "ADMIN_USER_NOTE_CREATED",
          targetType: "AdminUserNote",
          targetId: n.id,
        },
      });
      return n;
    });
    return Response.json({ id: note.id }, { status: 201 });
  } catch (e) {
    return apiError(e, "Could not add note.");
  }
}
