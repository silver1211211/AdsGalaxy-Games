import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeTapSession, startTapSession } from "@/features/tap-collector/server";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string; action: string }> },
) {
  try {
    const auth = await requireSession(),
      { sessionId, action } = await params;
    const session = await prisma.tapCollectorSession.findFirst({
      where: { id: sessionId, miniAppId: auth.miniAppId, userId: auth.userId },
    });
    if (!session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (action === "start") {
      await startTapSession(auth.miniAppId, auth.userId, sessionId);
    } else if (action === "pause" && session.status === "ACTIVE")
      await prisma.tapCollectorSession.update({
        where: { id: sessionId },
        data: {
          status: "PAUSED",
          pausedAt: new Date(),
          version: { increment: 1 },
        },
      });
    else if (
      action === "resume" &&
      session.status === "PAUSED" &&
      session.pausedAt
    ) {
      const paused = Date.now() - session.pausedAt.getTime();
      await prisma.tapCollectorSession.update({
        where: { id: sessionId },
        data: {
          status: "ACTIVE",
          pausedAt: null,
          pausedMs: { increment: paused },
          version: { increment: 1 },
        },
      });
    } else if (
      action === "abandon" &&
      !["COMPLETED", "ABANDONED"].includes(session.status)
    )
      await prisma.tapCollectorSession.update({
        where: { id: sessionId },
        data: {
          status: "ABANDONED",
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
    else if (action === "continue")
      return NextResponse.json(
        {
          error:
            "Continue requires an authenticated provider-verified utility ad; browser completion cannot grant it.",
        },
        { status: 503 },
      );
    else
      return NextResponse.json(
        { error: "Action unavailable" },
        { status: 422 },
      );
    return NextResponse.json(await serializeTapSession(sessionId));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not update session" },
      { status: 422 },
    );
  }
}
