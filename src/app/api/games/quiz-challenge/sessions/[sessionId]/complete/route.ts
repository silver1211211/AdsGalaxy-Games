import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import {
  completeQuizSession,
  serializeQuizSession,
} from "@/features/quiz/server";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession();
    const { sessionId } = await params;
    await completeQuizSession(sessionId, auth.miniAppId, auth.userId);
    return NextResponse.json({
      session: await serializeQuizSession(sessionId),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Completion failed" },
      { status: 400 },
    );
  }
}
