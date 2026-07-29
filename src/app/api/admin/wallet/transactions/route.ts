import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
export async function GET(request: Request) {
  try {
    const a = await requireAdmin(),
      q = new URL(request.url).searchParams,
      search = q.get("search");
    const items = await prisma.walletTransaction.findMany({
      where: {
        miniAppId: a.miniAppId,
        OR: search
          ? [
              { referenceId: { contains: search, mode: "insensitive" } },
              { user: { username: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: {
        user: { select: { id: true, username: true, firstName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      items: items.map((t) => ({
        ...t,
        amount: t.amount.toFixed(6),
        balanceBefore: t.balanceBefore?.toFixed(6),
        balanceAfter: t.balanceAfter?.toFixed(6),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load transactions" },
      { status: 400 },
    );
  }
}
