import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import {
  createQuizSession,
  serializeQuizSession,
} from "@/features/quiz/server";
const schema = z.object({
  mode: z.enum(["QUICK", "CLASSIC", "CATEGORY", "DAILY"]),
  categoryId: z.string().optional(),
});
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    const input = schema.parse(await request.json());
    const session = await createQuizSession({
      miniAppId: auth.miniAppId,
      userId: auth.userId,
      ...input,
    });
    return NextResponse.json(
      { session: await serializeQuizSession(session.id) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create Quiz",
      },
      { status: 400 },
    );
  }
}
