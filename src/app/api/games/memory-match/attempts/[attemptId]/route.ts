import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeAttempt } from "@/features/memory-match/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await requireSession();
    const { attemptId } = await params;
    const attempt = await prisma.memoryMatchAttempt.findFirst({
      where: {
        id: attemptId,
        miniAppId: session.miniAppId,
        userId: session.userId,
      },
    });
    if (!attempt)
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    return NextResponse.json({ attempt: await serializeAttempt(attempt.id) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not restore attempt" },
      { status: 400 },
    );
  }
}
