import { z } from "zod";
import { requireSession } from "@/lib/session";
import { createMazeAttempt } from "@/features/maze-runner/server";
const schema = z.object({ level: z.number().int().min(1).max(20) }).strict();
export async function POST(request: Request) {
  try { const auth = await requireSession(), input = schema.parse(await request.json()); return Response.json({ attempt: await createMazeAttempt(auth.miniAppId, auth.userId, input.level) }); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: error instanceof Error ? error.message : "Could not start Maze Runner" }, { status: 422 }); }
}
