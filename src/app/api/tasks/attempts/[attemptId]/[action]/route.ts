import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { submitTask } from "@/features/tasks/server";
const schema = z
  .object({
    idempotencyKey: z.string().uuid(),
    answer: z.string().max(500).optional(),
  })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; action: string }> },
) {
  try {
    const a = await requireSession(),
      { attemptId, action } = await params,
      input = schema.parse(await request.json()),
      attempt = await prisma.taskAttempt.findFirst({
        where: { id: attemptId, miniAppId: a.miniAppId, userId: a.userId },
      });
    if (!attempt)
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (action === "submit")
      return NextResponse.json(
        await submitTask(a.miniAppId, a.userId, attemptId, input.answer),
      );
    if (!["open", "return"].includes(action))
      return NextResponse.json(
        { error: "Action unavailable" },
        { status: 404 },
      );
    await prisma.$transaction([
      prisma.taskAttemptEvent.upsert({
        where: {
          attemptId_idempotencyKey: {
            attemptId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        create: {
          attemptId,
          idempotencyKey: input.idempotencyKey,
          type: action === "open" ? "DESTINATION_OPENED" : "RETURNED",
        },
        update: {},
      }),
      prisma.taskAttempt.update({
        where: { id: attemptId },
        data:
          action === "open"
            ? {
                status: "DESTINATION_OPENED",
                destinationOpenedAt: attempt.destinationOpenedAt ?? new Date(),
              }
            : { returnedAt: new Date() },
      }),
    ]);
    return NextResponse.json({
      status: action === "open" ? "DESTINATION_OPENED" : attempt.status,
      serverTime: new Date(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update task" },
      { status: 422 },
    );
  }
}
