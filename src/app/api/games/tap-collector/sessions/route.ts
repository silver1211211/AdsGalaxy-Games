import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { createTapSession } from "@/features/tap-collector/server";
const schema = z.object({
  level: z.number().int().min(1).max(10),
});
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    return NextResponse.json(
      await createTapSession(
        auth.miniAppId,
        auth.userId,
        schema.parse(await request.json()).level,
      ),
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create session",
      },
      { status: 422 },
    );
  }
}
