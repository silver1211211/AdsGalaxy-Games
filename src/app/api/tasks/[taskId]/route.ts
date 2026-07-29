import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const a = await requireSession(),
      { taskId } = await params,
      task = await prisma.task.findFirst({
        where: { id: taskId, miniAppId: a.miniAppId },
        include: {
          questions: {
            select: { id: true, type: true, prompt: true, options: true },
          },
          attempts: {
            where: { userId: a.userId },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({
      ...task,
      rewardWallet: task.rewardWallet.toFixed(6),
      attempt: task.attempts[0] ?? null,
      attempts: undefined,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Could not load task" }, { status: 400 });
  }
}
