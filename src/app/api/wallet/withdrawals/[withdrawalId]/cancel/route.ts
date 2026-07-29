import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { cancelWithdrawal } from "@/features/wallet/withdrawals";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ withdrawalId: string }> },
) {
  try {
    const auth = await requireSession(),
      { withdrawalId } = await params,
      w = await cancelWithdrawal(auth.miniAppId, auth.userId, withdrawalId);
    return NextResponse.json({ id: w.id, status: w.status });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not cancel withdrawal" },
      { status: 422 },
    );
  }
}
