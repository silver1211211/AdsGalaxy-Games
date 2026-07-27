import { NextResponse } from "next/server";
import { z } from "zod";
import { getLevel } from "@/features/memory-match/config";
import { calculateResult } from "@/features/memory-match/scoring";

const completionSchema = z.object({
  level: z.number().int().min(1).max(5),
  moves: z.number().int().positive().max(10000),
  elapsedSeconds: z.number().int().positive().max(86400),
  highestCombo: z.number().int().positive().max(15),
  matchedPairs: z.number().int().positive().max(15),
  score: z.number().int().nonnegative().max(10000000)
});

export async function POST(request: Request) {
  try {
    const input = completionSchema.parse(await request.json());
    const level = getLevel(input.level);
    const requiredPairs = (level.rows * level.columns) / 2;
    if (input.matchedPairs !== requiredPairs || input.moves < requiredPairs ||
      input.highestCombo > requiredPairs || input.elapsedSeconds < Math.max(2, requiredPairs - 1)) {
      return NextResponse.json({ error: "Invalid completion metrics" }, { status: 422 });
    }
    // Recalculate all economic-facing values server-side. The submitted display score is never trusted.
    const result = calculateResult(input);
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid completion payload" }, { status: 400 });
  }
}
