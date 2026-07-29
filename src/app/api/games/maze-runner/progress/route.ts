import { requireSession } from "@/lib/session";
import { mazeProgress } from "@/features/maze-runner/server";
export async function GET() {
  try { const auth = await requireSession(); return Response.json(await mazeProgress(auth.miniAppId, auth.userId)); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: "Could not load Maze Runner progress" }, { status: 500 }); }
}
