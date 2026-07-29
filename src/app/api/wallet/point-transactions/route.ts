import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET(request: Request) {
  try {
    const auth = await requireSession(),
      cursor = new URL(request.url).searchParams.get("cursor"),
      rows = await prisma.pointTransaction.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 51,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
      });
    return NextResponse.json({
      items: rows.slice(0, 50),
      nextCursor: rows.length > 50 ? rows[49].id : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load point activity" },
      { status: 400 },
    );
  }
}
