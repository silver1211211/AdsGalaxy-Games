import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET(request: Request) {
  try {
    const auth = await requireSession(),
      q = new URL(request.url).searchParams,
      cursor = q.get("cursor"),
      type = q.get("type"),
      status = q.get("status");
    const rows = await prisma.walletTransaction.findMany({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        type: type && type !== "ALL" ? (type as never) : undefined,
        status: status && status !== "ALL" ? (status as never) : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
    const more = rows.length > 50,
      items = rows.slice(0, 50);
    return NextResponse.json({
      items: items.map((t) => ({
        ...t,
        amount: t.amount.toFixed(6),
        balanceBefore: t.balanceBefore?.toFixed(6),
        balanceAfter: t.balanceAfter?.toFixed(6),
      })),
      nextCursor: more ? items.at(-1)?.id : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load transactions" },
      { status: 400 },
    );
  }
}
