import { z } from "zod";
import { requireSession } from "@/lib/session";
import { moveMaze, serializeMazeAttempt } from "@/features/maze-runner/server";
const schema = z.object({ direction: z.enum(["UP","DOWN","LEFT","RIGHT"]), version: z.number().int().positive(), idempotencyKey: z.string().uuid() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const auth = await requireSession(), { reference } = await params, input = schema.parse(await request.json());
    const result = await moveMaze({ miniAppId: auth.miniAppId, userId: auth.userId, publicReference: reference, ...input });
    return Response.json({ result, attempt: await serializeMazeAttempt(reference) });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "MOVE_REJECTED";
    return Response.json({ error: code }, { status: ["STALE_ATTEMPT","GATE_LOCKED"].includes(code) ? 409 : 422 });
  }
}
