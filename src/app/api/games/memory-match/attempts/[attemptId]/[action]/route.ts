import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeAttempt } from "@/features/memory-match/server";
import type { ServerCard } from "@/features/memory-match/types";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ attemptId: string; action: string }> },
) {
  try {
    const session = await requireSession();
    const { attemptId, action } = await params;
    const attempt = await prisma.memoryMatchAttempt.findFirst({
      where: {
        id: attemptId,
        miniAppId: session.miniAppId,
        userId: session.userId,
      },
    });
    if (!attempt)
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    const now = new Date();
    if (action === "pause") {
      if (attempt.status !== "ACTIVE")
        return NextResponse.json(
          { error: "Attempt is not active" },
          { status: 409 },
        );
      await prisma.memoryMatchAttempt.update({
        where: { id: attempt.id },
        data: { status: "PAUSED", pausedAt: now, version: { increment: 1 } },
      });
    } else if (action === "resume") {
      if (attempt.status !== "PAUSED" || !attempt.pausedAt)
        return NextResponse.json(
          { error: "Attempt is not paused" },
          { status: 409 },
        );
      const extra = Math.max(
        0,
        Math.floor((now.getTime() - attempt.pausedAt.getTime()) / 1000),
      );
      await prisma.memoryMatchAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "ACTIVE",
          pausedAt: null,
          pausedDurationSeconds: { increment: extra },
          lastActivityAt: now,
          version: { increment: 1 },
        },
      });
    } else if (action === "restart") {
      if (attempt.status === "COMPLETED")
        return NextResponse.json(
          { error: "Completed attempts cannot be restarted" },
          { status: 409 },
        );
      const board = (attempt.board as unknown as ServerCard[]).map((card) => ({
        ...card,
        matched: false,
      }));
      await prisma.memoryMatchAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "ACTIVE",
          board,
          matchedPairSlots: [],
          firstSelectedIndex: null,
          moves: 0,
          mismatches: 0,
          currentCombo: 0,
          highestCombo: 0,
          shuffleCount: 0,
          startedAt: now,
          lastActivityAt: now,
          pausedAt: null,
          pausedDurationSeconds: 0,
          version: { increment: 1 },
        },
      });
    } else if (action === "abandon") {
      await prisma.memoryMatchAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "ABANDONED",
          firstSelectedIndex: null,
          version: { increment: 1 },
        },
      });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
    return NextResponse.json({ attempt: await serializeAttempt(attempt.id) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not update attempt" },
      { status: 400 },
    );
  }
}
