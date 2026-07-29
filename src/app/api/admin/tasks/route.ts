import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { hashTaskAnswer, safeTaskDestination } from "@/features/tasks/engine";
const schema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,64}$/),
    title: z.string().min(3).max(120),
    description: z.string().min(3).max(300),
    instructions: z.string().min(3).max(5000),
    category: z.string().max(40),
    type: z.enum([
      "TELEGRAM_CHANNEL_JOIN",
      "TELEGRAM_GROUP_JOIN",
      "TELEGRAM_BOT_START",
      "TELEGRAM_POST_VIEW",
      "MINI_APP_OPEN",
      "WEBSITE_VISIT",
      "SOCIAL_ACTION",
      "ADS_GALAXY_AD",
      "GAME_COMPLETION",
      "DAILY_CHECK_IN",
      "QUIZ_OR_SURVEY",
      "CUSTOM_PROOF",
      "PARTNER_CALLBACK",
    ]),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
    destinationUrl: z.string().nullable(),
    verificationMethod: z.enum([
      "INTERNAL_EVENT",
      "TELEGRAM_MEMBERSHIP",
      "TELEGRAM_BOT_CALLBACK",
      "PARTNER_CALLBACK",
      "ADS_GALAXY_VERIFICATION",
      "COMPLETION_CODE",
      "CONFIRMATION_QUESTION",
      "MANUAL_PROOF",
      "REINFORCED_SELF_CONFIRMATION",
      "NONE",
    ]),
    verificationStrength: z.enum([
      "VERIFIED",
      "REINFORCED_SELF_CONFIRMATION",
      "MANUAL_REVIEW",
    ]),
    minimumEngagementSeconds: z.number().int().min(0).max(3600),
    rewardType: z.enum([
      "POINTS",
      "WALLET",
      "POINTS_AND_WALLET",
      "NON_FINANCIAL",
    ]),
    rewardPoints: z.number().int().min(0),
    rewardWallet: z.string(),
    repeatPolicy: z.enum(["ONCE", "DAILY", "WEEKLY"]),
    estimatedSeconds: z.number().int().min(5).max(86400),
    featured: z.boolean(),
    question: z
      .object({
        type: z.enum([
          "MULTIPLE_CHOICE",
          "SHORT_ANSWER",
          "EXACT_CODE",
          "ACKNOWLEDGEMENT",
        ]),
        prompt: z.string().min(3),
        answer: z.string().min(1),
        options: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .strict();
export async function GET() {
  try {
    const a = await requireAdmin(),
      items = await prisma.task.findMany({
        where: { miniAppId: a.miniAppId },
        include: {
          _count: { select: { attempts: true } },
          questions: {
            select: { id: true, type: true, prompt: true, options: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    return NextResponse.json({
      items: items.map((t) => ({
        ...t,
        rewardWallet: t.rewardWallet.toFixed(6),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load tasks" },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const a = await requireAdmin(),
      i = schema.parse(await request.json());
    if (i.destinationUrl && !safeTaskDestination(i.destinationUrl))
      throw new Error("Destination must be a safe HTTPS URL");
    if (
      i.verificationStrength === "REINFORCED_SELF_CONFIRMATION" &&
      ["WALLET", "POINTS_AND_WALLET"].includes(i.rewardType)
    )
      throw new Error("Self-confirmed tasks must use points-only rewards");
    const task = await prisma.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          miniAppId: a.miniAppId,
          slug: i.slug,
          title: i.title,
          description: i.description,
          instructions: i.instructions,
          category: i.category,
          type: i.type,
          status: i.status,
          destinationUrl: i.destinationUrl,
          verificationMethod: i.verificationMethod,
          verificationStrength: i.verificationStrength,
          minimumEngagementSeconds: i.minimumEngagementSeconds,
          rewardType: i.rewardType,
          rewardPoints: i.rewardPoints,
          rewardWallet: new Prisma.Decimal(i.rewardWallet),
          repeatPolicy: i.repeatPolicy,
          estimatedSeconds: i.estimatedSeconds,
          featured: i.featured,
        },
      });
      if (i.question) {
        const h = hashTaskAnswer(i.question.answer);
        await tx.taskConfirmationQuestion.create({
          data: {
            taskId: t.id,
            type: i.question.type,
            prompt: i.question.prompt,
            options: i.question.options ?? undefined,
            answerHash: h.hash,
            salt: h.salt,
          },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "TASK_CREATED",
          targetType: "Task",
          targetId: t.id,
        },
      });
      return t;
    });
    return NextResponse.json({ id: task.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create task" },
      { status: 422 },
    );
  }
}
