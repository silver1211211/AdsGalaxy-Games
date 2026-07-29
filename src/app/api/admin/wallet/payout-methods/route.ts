import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
const schema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_]{2,40}$/),
    name: z.string().min(2).max(80),
    instructions: z.string().max(1000),
    destinationLabel: z.string().min(2).max(80),
    validationPattern: z.string().max(300).nullable(),
    enabled: z.boolean(),
    minimumAmount: z.string(),
    maximumAmount: z.string(),
    fixedFee: z.string(),
    feeBasisPoints: z.number().int().min(0).max(10000),
    sortOrder: z.number().int().min(0).max(1000),
  })
  .strict();
export async function GET() {
  try {
    const a = await requireAdmin(),
      items = await prisma.walletPayoutMethod.findMany({
        where: { miniAppId: a.miniAppId },
        orderBy: { sortOrder: "asc" },
      });
    return NextResponse.json({
      items: items.map((m) => ({
        ...m,
        minimumAmount: m.minimumAmount.toFixed(6),
        maximumAmount: m.maximumAmount.toFixed(6),
        fixedFee: m.fixedFee.toFixed(6),
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load payout methods" },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const a = await requireAdmin(),
      i = schema.parse(await request.json());
    const item = await prisma.$transaction(async (tx) => {
      const m = await tx.walletPayoutMethod.create({
        data: {
          ...i,
          miniAppId: a.miniAppId,
          minimumAmount: new Prisma.Decimal(i.minimumAmount),
          maximumAmount: new Prisma.Decimal(i.maximumAmount),
          fixedFee: new Prisma.Decimal(i.fixedFee),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "PAYOUT_METHOD_CREATED",
          targetType: "WalletPayoutMethod",
          targetId: m.id,
        },
      });
      return m;
    });
    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not create payout method",
      },
      { status: 422 },
    );
  }
}
