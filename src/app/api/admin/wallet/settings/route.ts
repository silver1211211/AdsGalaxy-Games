import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getWalletSettings } from "@/features/wallet/server";
const schema = z
  .object({
    walletEnabled: z.boolean(),
    withdrawalsEnabled: z.boolean(),
    conversionEnabled: z.boolean(),
    conversionEmergencyDisabled: z.boolean(),
    pointsPerDollar: z.number().int().positive(),
    minimumConversionPoints: z.number().int().positive(),
    maximumConversionPointsRequest: z.number().int().positive(),
    maximumConversionPointsDay: z.number().int().positive(),
    maximumConversionCreditDay: z.string(),
    conversionFeeBps: z.number().int().min(0).max(10000),
    minimumWithdrawal: z.string(),
    maximumWithdrawal: z.string(),
    maximumWithdrawalDay: z.string(),
    maximumMiniAppPayoutDay: z.string(),
    maximumOutstandingLiability: z.string(),
    cancellationMinutes: z.number().int().min(0).max(1440),
    emergencyDisabled: z.boolean(),
  })
  .strict();
const output = (s: Awaited<ReturnType<typeof getWalletSettings>>) => ({
  ...s,
  minimumWithdrawal: s.minimumWithdrawal.toFixed(6),
  maximumWithdrawal: s.maximumWithdrawal.toFixed(6),
  maximumWithdrawalDay: s.maximumWithdrawalDay.toFixed(6),
  maximumMiniAppPayoutDay: s.maximumMiniAppPayoutDay.toFixed(6),
  maximumOutstandingLiability: s.maximumOutstandingLiability.toFixed(6),
  maximumConversionCreditDay: s.maximumConversionCreditDay.toFixed(6),
});
export async function GET() {
  try {
    const a = await requireAdmin();
    return NextResponse.json(output(await getWalletSettings(a.miniAppId)));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load wallet settings" },
      { status: 400 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const a = await requireAdmin(),
      input = schema.parse(await request.json()),
      before = await getWalletSettings(a.miniAppId);
    const saved = await prisma.$transaction(async (tx) => {
      const s = await tx.walletSettings.update({
        where: { miniAppId: a.miniAppId },
        data: {
          ...input,
          minimumWithdrawal: new Prisma.Decimal(input.minimumWithdrawal),
          maximumWithdrawal: new Prisma.Decimal(input.maximumWithdrawal),
          maximumWithdrawalDay: new Prisma.Decimal(input.maximumWithdrawalDay),
          maximumMiniAppPayoutDay: new Prisma.Decimal(
            input.maximumMiniAppPayoutDay,
          ),
          maximumOutstandingLiability: new Prisma.Decimal(
            input.maximumOutstandingLiability,
          ),
          maximumConversionCreditDay: new Prisma.Decimal(
            input.maximumConversionCreditDay,
          ),
          updatedById: a.userId,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "WALLET_SETTINGS_UPDATED",
          targetType: "WalletSettings",
          targetId: s.id,
          before: JSON.parse(JSON.stringify(output(before))),
          after: JSON.parse(JSON.stringify(input)),
        },
      });
      return s;
    });
    return NextResponse.json(output(saved));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not save wallet settings",
      },
      { status: 422 },
    );
  }
}
