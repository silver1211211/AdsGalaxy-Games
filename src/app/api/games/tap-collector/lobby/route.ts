import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getTapSettings, levels, unlockedLevel } from "@/features/tap-collector/server";
export async function GET() {
  try {
    const auth = await requireSession();
    const [settings, unlocked, completed, active] = await Promise.all([
      getTapSettings(auth.miniAppId),
      unlockedLevel(auth.miniAppId, auth.userId),
      prisma.tapCollectorSession.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId, status: "COMPLETED" },
        select: { level: true, activeElapsedMs: true, finalPoints: true },
      }),
      prisma.tapCollectorSession.findFirst({
        where: { miniAppId: auth.miniAppId, userId: auth.userId, status: { in: ["READY", "ACTIVE", "PAUSED", "AD_BREAK"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const best = new Map<number, number>();
    for (const row of completed) if (row.activeElapsedMs != null) best.set(row.level, Math.min(best.get(row.level) ?? Infinity, row.activeElapsedMs));
    return NextResponse.json({
      enabled: settings.enabled && !settings.emergencyDisabled, unlocked,
      levels: levels.map((x) => ({ ...x, unlocked: x.level <= unlocked, completed: best.has(x.level), bestTimeMs: best.get(x.level) ?? null })),
      stats: { completed: completed.length, highScore: Math.max(0, ...completed.map((x) => x.finalPoints)) },
      active: active && { id: active.id, level: active.level, score: active.score },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Could not load Catch Rush" }, { status: 400 });
  }
}
