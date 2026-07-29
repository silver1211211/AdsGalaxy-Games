import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createWithdrawal } from "@/features/wallet/withdrawals";
const schema = z
  .object({
    payoutMethodId: z.string(),
    amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
    destination: z.string().trim().min(4).max(300),
    memo: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const auth = await requireSession(),
      cursor = new URL(request.url).searchParams.get("cursor"),
      rows = await prisma.withdrawal.findMany({
        where: { miniAppId: auth.miniAppId, userId: auth.userId },
        include: { payoutMethod: { select: { name: true, code: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 21,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
      });
    return NextResponse.json({
      items: rows
        .slice(0, 20)
        .map(({ destinationEncrypted, memoEncrypted, ...w }) => ({
          ...w,
          amount: w.amount.toFixed(6),
          fee: w.fee.toFixed(6),
          netAmount: w.netAmount.toFixed(6),
        })),
      nextCursor: rows.length > 20 ? rows[19].id : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load withdrawals" },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const auth = await requireSession(),
      input = schema.parse(await request.json()),
      withdrawal = await createWithdrawal({
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        ...input,
      });
    return NextResponse.json(
      {
        id: withdrawal.id,
        status: withdrawal.status,
        amount: withdrawal.amount.toFixed(6),
        fee: withdrawal.fee.toFixed(6),
        netAmount: withdrawal.netAmount.toFixed(6),
        destinationMasked: withdrawal.destinationMasked,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not request withdrawal",
      },
      { status: 422 },
    );
  }
}
