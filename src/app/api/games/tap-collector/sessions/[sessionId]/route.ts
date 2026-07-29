import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeTapSession } from "@/features/tap-collector/server";
import { catchRushSessionHealth } from "@/features/tap-collector/engine";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession(),
      { sessionId } = await params;
    const session = await prisma.tapCollectorSession.findFirst({
      where: { id: sessionId, miniAppId: auth.miniAppId, userId: auth.userId },
      include: { _count: { select: { events: true } } },
    });
    if (!session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const health = catchRushSessionHealth({
      status: session.status, startedAt: session.startedAt, waveStartedAt: session.waveStartedAt,
      score: session.score, combo: session.combo, eventCount: session._count.events, expiresAt: session.expiresAt,
    });
    if (health === "EXPIRED") {
      await prisma.tapCollectorSession.update({
        where: { id: session.id },
        data: {
          status: "EXPIRED",
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
      return NextResponse.json(
        {
          error: "This game session can no longer be resumed.",
          code: "SESSION_EXPIRED",
        },
        { status: 410 },
      );
    }
    if (health === "CORRUPTED") {
      await prisma.tapCollectorSession.update({
        where: { id: session.id },
        data: {
          status: "INVALIDATED",
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
      return NextResponse.json(
        {
          error: "This game session can no longer be resumed.",
          code: "SESSION_CORRUPTED",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(await serializeTapSession(sessionId));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not restore session" },
      { status: 400 },
    );
  }
}
