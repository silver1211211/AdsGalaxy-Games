import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { convertPoints } from "@/features/wallet/server";
const schema = z
  .object({
    points: z.number().int().positive(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth.source === "DEVELOPMENT")
      return NextResponse.json({ error: "A Telegram-authenticated session is required" }, { status: 403 });
    const
      input = schema.parse(await request.json()),
      result = await convertPoints({
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        ...input,
      });
    return NextResponse.json({
      id: result.id,
      points: result.points,
      netAmount: result.netAmount.toFixed(6),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not convert points" },
      { status: 422 },
    );
  }
}
