import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeQuizSession } from "@/features/quiz/server";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession();
    const { sessionId } = await params;
    const owned = await prisma.quizSession.findFirst({
      where: { id: sessionId, miniAppId: auth.miniAppId, userId: auth.userId },
    });
    if (!owned)
      return NextResponse.json(
        { error: "Quiz session not found" },
        { status: 404 },
      );
    return NextResponse.json({
      session: await serializeQuizSession(sessionId),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not restore Quiz" },
      { status: 400 },
    );
  }
}
