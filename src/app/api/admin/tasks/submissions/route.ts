import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
export async function GET() {
  try {
    const a = await requireAdmin(),
      items = await prisma.taskSubmission.findMany({
        where: { miniAppId: a.miniAppId },
        include: {
          attempt: {
            include: {
              task: {
                select: {
                  title: true,
                  type: true,
                  rewardType: true,
                  rewardPoints: true,
                  rewardWallet: true,
                },
              },
            },
          },
          user: { select: { id: true, username: true, firstName: true } },
          proofs: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    return NextResponse.json({
      items: items.map((i) => ({
        ...i,
        attempt: {
          ...i.attempt,
          rewardWallet: i.attempt.rewardWallet.toFixed(6),
          task: {
            ...i.attempt.task,
            rewardWallet: i.attempt.task.rewardWallet.toFixed(6),
          },
        },
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load submissions" },
      { status: 400 },
    );
  }
}
