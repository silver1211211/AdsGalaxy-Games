import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await prisma.memoryMatchAttempt.groupBy({
      by: ["level"],
      where: {
        miniAppId: session.miniAppId,
        userId: session.userId,
        status: "COMPLETED",
      },
      _max: { finalPoints: true, stars: true },
    });
    const highest = rows.reduce((value, row) => Math.max(value, row.level), 0);
    return NextResponse.json({
      highestUnlockedLevel: Math.min(15, highest + 1),
      levels: Array.from({ length: 15 }, (_, index) => {
        const level = index + 1;
        const row = rows.find((item) => item.level === level);
        return {
          level,
          completed: Boolean(row),
          bestScore: row?._max.finalPoints ?? 0,
          bestStars: row?._max.stars ?? 0,
        };
      }),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load progress" },
      { status: 400 },
    );
  }
}
