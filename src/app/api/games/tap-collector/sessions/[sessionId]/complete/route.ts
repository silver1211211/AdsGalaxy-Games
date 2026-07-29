import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { completeTapSession } from "@/features/tap-collector/server";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession(),
      { sessionId } = await params;
    return NextResponse.json(
      await completeTapSession(auth.miniAppId, auth.userId, sessionId),
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not complete session" },
      { status: 422 },
    );
  }
}
