import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
export async function GET(request: Request) {
  try {
    const a = await requireAdmin(),
      status = new URL(request.url).searchParams.get("status"),
      items = await prisma.withdrawal.findMany({
        where: {
          miniAppId: a.miniAppId,
          status: status ? (status as never) : undefined,
        },
        include: {
          user: { select: { id: true, username: true, firstName: true } },
          payoutMethod: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    return NextResponse.json({
      items: items.map(({ destinationEncrypted, ...w }) => ({
        ...w,
        amount: w.amount.toFixed(6),
        fee: w.fee.toFixed(6),
        netAmount: w.netAmount.toFixed(6),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load withdrawals" },
      { status: 400 },
    );
  }
}
