import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ withdrawalId: string }> },
) {
  try {
    const auth = await requireSession(),
      { withdrawalId } = await params,
      w = await prisma.withdrawal.findFirst({
        where: {
          id: withdrawalId,
          miniAppId: auth.miniAppId,
          userId: auth.userId,
        },
        include: {
          payoutMethod: {
            select: { name: true, code: true, instructions: true },
          },
        },
      });
    if (!w)
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 },
      );
    const { destinationEncrypted, ...safe } = w;
    return NextResponse.json({
      ...safe,
      amount: w.amount.toFixed(6),
      fee: w.fee.toFixed(6),
      netAmount: w.netAmount.toFixed(6),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load withdrawal" },
      { status: 400 },
    );
  }
}
