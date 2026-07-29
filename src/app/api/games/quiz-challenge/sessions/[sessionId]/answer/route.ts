import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { answerQuestion, serializeQuizSession } from "@/features/quiz/server";
const schema = z.object({
  optionKey: z
    .string()
    .regex(/^[A-D]$/)
    .optional(),
  version: z.number().int().positive(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession();
    const { sessionId } = await params;
    const input = schema.parse(await request.json());
    const result = await answerQuestion({
      sessionId,
      miniAppId: auth.miniAppId,
      userId: auth.userId,
      ...input,
    });
    return NextResponse.json({
      feedback: result.feedback,
      finalQuestion: result.finalQuestion,
      session: await serializeQuizSession(sessionId),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Answer failed";
    return NextResponse.json(
      { error: message },
      { status: message === "STALE_VERSION" ? 409 : 400 },
    );
  }
}
