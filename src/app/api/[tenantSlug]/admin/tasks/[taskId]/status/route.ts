import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
const schema = z
  .object({ action: z.enum(["PAUSE", "RESUME", "ARCHIVE"]) })
  .strict();
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; taskId: string }> },
) {
  try {
    assertSameOrigin(request);
    const p = await params,
      a = await requireTenantAdmin(p.tenantSlug);
    rateLimit(`admin-task-status:${a.userId}`);
    const { action } = schema.parse(await request.json()),
      task = await prisma.task.findFirst({
        where: { id: p.taskId, miniAppId: a.miniAppId },
      });
    if (!task)
      return Response.json(
        { error: "Task not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    const status =
        action === "PAUSE"
          ? "PAUSED"
          : action === "RESUME"
            ? "ACTIVE"
            : "ARCHIVED",
      saved = await prisma.$transaction(async (tx) => {
        const t = await tx.task.update({
          where: { id: task.id },
          data: { status },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: `TASK_${action}D`,
            targetType: "Task",
            targetId: t.id,
            before: { status: task.status },
            after: { status },
          },
        });
        return t;
      });
    return Response.json({ status: saved.status });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          { error: "Could not update task", code: "INVALID_TASK" },
          { status: 422 },
        );
  }
}
