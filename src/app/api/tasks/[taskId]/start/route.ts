import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { startTask } from "@/features/tasks/server";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const a = await requireSession(),
      { taskId } = await params,
      attempt = await startTask(a.miniAppId, a.userId, taskId);
    return NextResponse.json({
      id: attempt.id,
      status: attempt.status,
      expiresAt: attempt.expiresAt,
      destinationUrl: attempt.task.destinationUrl,
      minimumEngagementSeconds: attempt.minimumEngagementSeconds,
      question: attempt.task.questions[0]
        ? {
            id: attempt.task.questions[0].id,
            type: attempt.task.questions[0].type,
            prompt: attempt.task.questions[0].prompt,
            options: attempt.task.questions[0].options,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start task" },
      { status: 422 },
    );
  }
}
