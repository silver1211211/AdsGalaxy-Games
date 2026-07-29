import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { safeTaskDestination } from "@/features/tasks/engine";
import { prisma } from "@/lib/prisma";

const destinationTypes = {
  WEBSITE: "WEBSITE_VISIT",
  TELEGRAM_CHANNEL: "TELEGRAM_CHANNEL_JOIN",
  TELEGRAM_GROUP: "TELEGRAM_GROUP_JOIN",
  TELEGRAM_BOT: "TELEGRAM_BOT_START",
  OTHER: "SOCIAL_ACTION",
} as const;

const editTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(300),
    destinationUrl: z.string().max(500),
    destinationType: z.enum([
      "WEBSITE",
      "TELEGRAM_CHANNEL",
      "TELEGRAM_GROUP",
      "TELEGRAM_BOT",
      "OTHER",
    ]),
    rewardType: z.enum(["POINTS", "WALLET"]),
    rewardAmount: z.string().regex(/^\d+(\.\d{1,6})?$/),
    unlimited: z.boolean(),
    maximumCompletions: z.number().int().positive().max(1_000_000).nullable(),
    status: z.enum(["ACTIVE", "PAUSED"]),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
  })
  .strict()
  .superRefine((input, context) => {
    if (!safeTaskDestination(input.destinationUrl))
      context.addIssue({
        code: "custom",
        path: ["destinationUrl"],
        message: "Use a safe HTTPS URL",
      });
    if (input.rewardType === "WALLET")
      context.addIssue({
        code: "custom",
        path: ["rewardType"],
        message:
          "USD rewards require trusted platform verification and are not available for five-second link tasks",
      });
    if (!input.unlimited && !input.maximumCompletions)
      context.addIssue({
        code: "custom",
        path: ["maximumCompletions"],
        message: "Add a finite completion limit or choose Unlimited",
      });
    if (
      input.startsAt &&
      input.endsAt &&
      new Date(input.startsAt) >= new Date(input.endsAt)
    )
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End date must be after start date",
      });
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; taskId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { tenantSlug, taskId } = await params;
    const auth = await requireTenantAdmin(tenantSlug);
    rateLimit(`admin-task-edit:${auth.userId}`);
    const input = editTaskSchema.parse(await request.json());
    const current = await prisma.task.findFirst({
      where: { id: taskId, miniAppId: auth.miniAppId },
    });
    if (!current)
      return Response.json(
        { error: "Task not found", code: "INVALID_TASK" },
        { status: 404 },
      );
    if (
      !input.unlimited &&
      input.maximumCompletions! < current.completionsCount
    )
      return Response.json(
        {
          error: "Maximum completions cannot be below completed claims.",
          code: "INVALID_TASK",
        },
        { status: 422 },
      );
    const rewardPoints = Math.round(Number(input.rewardAmount));
    const settings = await prisma.taskSettings.findUnique({
      where: { miniAppId: auth.miniAppId },
    });
    if (
      rewardPoints < 1 ||
      rewardPoints > (settings?.maximumPointsRewardTask ?? 10_000)
    )
      return Response.json(
        { error: "Invalid point reward", code: "INVALID_TASK" },
        { status: 422 },
      );
    const saved = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: current.id },
        data: {
          title: input.title,
          description: input.description,
          destinationUrl: safeTaskDestination(input.destinationUrl),
          category: input.destinationType,
          type: destinationTypes[input.destinationType],
          status: input.status,
          rewardType: "POINTS",
          rewardPoints,
          rewardWallet: new Prisma.Decimal(0),
          maximumCompletions: input.unlimited ? null : input.maximumCompletions,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          version: { increment: 1 },
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "TASK_EDITED",
          targetType: "Task",
          targetId: task.id,
          before: {
            title: current.title,
            rewardPoints: current.rewardPoints,
            maximumCompletions: current.maximumCompletions,
            status: current.status,
          },
          after: {
            title: task.title,
            rewardPoints: task.rewardPoints,
            maximumCompletions: task.maximumCompletions,
            status: task.status,
          },
        },
      });
      return task;
    });
    return Response.json({
      item: {
        ...saved,
        rewardWallet: saved.rewardWallet.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Invalid task",
        code: "INVALID_TASK",
      },
      { status: 422 },
    );
  }
}
