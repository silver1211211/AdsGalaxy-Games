import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { safeTaskDestination } from "@/features/tasks/engine";
import { prisma } from "@/lib/prisma";
const types = {
  WEBSITE: "WEBSITE_VISIT",
  TELEGRAM_CHANNEL: "TELEGRAM_CHANNEL_JOIN",
  TELEGRAM_GROUP: "TELEGRAM_GROUP_JOIN",
  TELEGRAM_BOT: "TELEGRAM_BOT_START",
  OTHER: "SOCIAL_ACTION",
} as const;
const simpleTaskSchema = z
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
    maximumCompletions: z.number().int().positive().max(1000000).nullable(),
    status: z.enum(["ACTIVE", "PAUSED"]),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
  })
  .strict()
  .superRefine((x, ctx) => {
    if (!safeTaskDestination(x.destinationUrl))
      ctx.addIssue({
        code: "custom",
        path: ["destinationUrl"],
        message: "Use a safe HTTPS URL",
      });
    if (x.rewardType === "WALLET")
      ctx.addIssue({
        code: "custom",
        path: ["rewardType"],
        message:
          "USD rewards require trusted platform verification and are not available for five-second link tasks",
      });
    if (!x.unlimited && !x.maximumCompletions)
      ctx.addIssue({
        code: "custom",
        path: ["maximumCompletions"],
        message: "Add a finite completion limit or choose Unlimited",
      });
    if (x.startsAt && x.endsAt && new Date(x.startsAt) >= new Date(x.endsAt))
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End date must be after start date",
      });
  });
const output = (t: any) => ({
  ...t,
  rewardWallet: t.rewardWallet?.toFixed?.(2) ?? String(t.rewardWallet),
});
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const a = await requireTenantAdmin((await params).tenantSlug),
      items = await prisma.task.findMany({
        where: { miniAppId: a.miniAppId },
        orderBy: { createdAt: "desc" },
      });
    return Response.json({ items: items.map(output) });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json({ error: "Could not load tasks" }, { status: 500 });
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const a = await requireTenantAdmin((await params).tenantSlug);
    rateLimit(`admin-task-create:${a.userId}`);
    const i = simpleTaskSchema.parse(await request.json()),
      settings = await prisma.taskSettings.findUnique({
        where: { miniAppId: a.miniAppId },
      }),
      count = await prisma.task.count({
        where: { miniAppId: a.miniAppId, status: { in: ["ACTIVE", "PAUSED"] } },
      });
    if (settings && count >= settings.maximumActiveTasks)
      return Response.json(
        { error: "Task limit reached", code: "TASK_LIMIT_REACHED" },
        { status: 409 },
      );
    const rewardPoints = Math.round(Number(i.rewardAmount));
    if (
      rewardPoints < 1 ||
      rewardPoints > (settings?.maximumPointsRewardTask ?? 10000)
    )
      return Response.json(
        { error: "Invalid point reward", code: "INVALID_TASK" },
        { status: 422 },
      );
    const slug = `${i.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48)}-${crypto.randomUUID().slice(0, 6)}`,
      task = await prisma.$transaction(async (tx) => {
        const t = await tx.task.create({
          data: {
            miniAppId: a.miniAppId,
            slug,
            title: i.title,
            description: i.description,
            instructions:
              "Open the destination, complete the requested action, and return to claim.",
            category: i.destinationType,
            type: types[i.destinationType],
            status: i.status,
            destinationUrl: safeTaskDestination(i.destinationUrl),
            verificationMethod: "REINFORCED_SELF_CONFIRMATION",
            verificationStrength: "REINFORCED_SELF_CONFIRMATION",
            minimumEngagementSeconds: 5,
            rewardType: "POINTS",
            rewardPoints,
            rewardWallet: new Prisma.Decimal(0),
            repeatPolicy: "ONCE",
            maximumCompletions: i.unlimited ? null : i.maximumCompletions,
            estimatedSeconds: 5,
            startsAt: i.startsAt ? new Date(i.startsAt) : null,
            endsAt: i.endsAt ? new Date(i.endsAt) : null,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "TASK_CREATED",
            targetType: "Task",
            targetId: t.id,
            after: {
              title: t.title,
              rewardPoints: t.rewardPoints,
              maximumCompletions: t.maximumCompletions,
              status: t.status,
            },
          },
        });
        return t;
      });
    return Response.json({ item: output(task) }, { status: 201 });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          {
            error: e instanceof Error ? e.message : "Invalid task",
            code: "INVALID_TASK",
          },
          { status: 422 },
        );
  }
}
