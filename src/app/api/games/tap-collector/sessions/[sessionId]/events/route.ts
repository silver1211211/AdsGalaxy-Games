import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import {
  processTap,
  serializeTapSession,
} from "@/features/tap-collector/server";
const schema = z.object({
  spawnEventId: z.string(),
  eventType: z.enum(["TAP", "MISS"]),
  idempotencyKey: z.string().min(8).max(100),
  version: z.number().int().positive(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireSession(),
      { sessionId } = await params;
    await processTap(
      auth.miniAppId,
      auth.userId,
      sessionId,
      schema.parse(await request.json()),
    );
    return NextResponse.json(await serializeTapSession(sessionId));
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Invalid event";
    const diagnosticReference = `cr_${crypto.randomUUID().slice(0, 8)}`;
    return NextResponse.json(
      {
        error:
          message === "EVENT_TIMING_INVALID"
            ? "We couldn’t synchronize this game event."
            : message,
        code: message,
        diagnosticReference,
      },
      { status: message === "STALE_VERSION" ? 409 : 422 },
    );
  }
}
