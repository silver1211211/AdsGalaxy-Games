import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serializeMazeAttempt } from "@/features/maze-runner/server";
export async function GET(_: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const auth = await requireSession(), { reference } = await params;
    const owned = await prisma.mazeRunnerAttempt.findFirst({ where: { publicReference: reference, miniAppId: auth.miniAppId, userId: auth.userId }, select: { id: true } });
    if (!owned) return Response.json({ error: "Attempt not found" }, { status: 404 });
    return Response.json({ attempt: await serializeMazeAttempt(reference) });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: "Could not restore attempt" }, { status: 500 }); }
}
