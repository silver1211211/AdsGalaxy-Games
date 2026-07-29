import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
const labels: Record<string, string> = {
  MATCHED: "Reward found",
  AD_REQUESTED: "Ad requested",
  BROWSER_COMPLETED: "Ad completed in app",
  PENDING_VERIFICATION: "Awaiting verification",
  VERIFIED: "Verified, processing credit",
  NO_FILL: "No ad available",
  FAILED: "Could not complete",
  EXPIRED: "Expired",
};
export async function GET(request: Request) {
  try {
    const auth = await requireSession(),
      query = new URL(request.url).searchParams,
      cursor = query.get("cursor");
    const claims = await prisma.gameRewardClaim.findMany({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        rewardType: { in: ["MONEY", "WALLET"] },
        status: { not: "CREDITED" },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
    const more = claims.length > 20,
      rows = claims.slice(0, 20);
    return NextResponse.json({
      items: rows.map((c) => ({
        id: c.id,
        game: c.gameKey,
        amount: c.configuredMoneyAmount?.toFixed(6) ?? "0.000000",
        context: c.claimContext,
        level: c.level,
        wave: c.wave,
        status: c.status,
        statusLabel: labels[c.status] ?? c.status,
        createdAt: c.createdAt,
        nextRetryAt: c.nextRetryAt,
        expiresAt: c.expiresAt,
        deepLink:
          c.gameKey === "memory-match"
            ? "/games/memory-match"
            : c.gameKey === "quiz-challenge"
              ? `/games/quiz-challenge/play?session=${c.quizSessionId}`
              : `/games/tap-collector/play?session=${c.tapCollectorSessionId}`,
      })),
      nextCursor: more ? rows.at(-1)?.id : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load pending rewards" },
      { status: 400 },
    );
  }
}
