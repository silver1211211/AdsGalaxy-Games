import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeQuizSession } from "@/features/quiz/server";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession();
    const { sessionId } = await params;
    const session = await prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        status: "AD_BREAK",
      },
      include: { questions: true },
    });
    if (!session)
      return NextResponse.json(
        { error: "No Quiz break is active" },
        { status: 409 },
      );
    const next = session.questions.find(
      (question) => question.position === session.currentPosition,
    );
    await prisma.$transaction([
      prisma.quizSession.update({
        where: { id: session.id },
        data: {
          status: "ACTIVE",
          questionStartedAt: new Date(),
          questionAllowedSeconds: next?.allowedSeconds,
          version: { increment: 1 },
        },
      }),
      ...(next
        ? [
            prisma.quizSessionQuestion.update({
              where: { id: next.id },
              data: { startedAt: new Date() },
            }),
          ]
        : []),
    ]);
    return NextResponse.json({
      session: await serializeQuizSession(session.id),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not continue Quiz" },
      { status: 400 },
    );
  }
}
