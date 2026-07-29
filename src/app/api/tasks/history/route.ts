import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET() {
  try {
    const a = await requireSession(),
      items = await prisma.taskAttempt.findMany({
        where: { miniAppId: a.miniAppId, userId: a.userId },
        include: {
          task: { select: { title: true, type: true, repeatPolicy: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    return NextResponse.json({
      items: items.map((i) => ({
        ...i,
        rewardWallet: i.rewardWallet.toFixed(6),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load task history" },
      { status: 400 },
    );
  }
}
