import { requireSession } from "@/lib/session";
import { pauseMaze, serializeMazeAttempt } from "@/features/maze-runner/server";
export async function POST(_: Request, { params }: { params: Promise<{ reference: string; action: string }> }) {
  try {
    const auth = await requireSession(), { reference, action } = await params;
    if (action !== "pause" && action !== "resume") return Response.json({ error: "Unsupported action" }, { status: 404 });
    await pauseMaze(auth.miniAppId, auth.userId, reference, action === "resume");
    return Response.json({ attempt: await serializeMazeAttempt(reference) });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: "Could not update attempt" }, { status: 422 }); }
}
