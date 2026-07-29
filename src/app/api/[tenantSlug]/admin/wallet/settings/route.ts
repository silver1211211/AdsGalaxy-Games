import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { getWalletSettings } from "@/features/wallet/server";
import { prisma } from "@/lib/prisma";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
const tenantWalletSettingsSchema = z
  .object({
    currency: z.enum(["USD"]),
    pointsPerDollar: z.number().int().min(1).max(1000000),
    minimumConversionPoints: z.number().int().min(1).max(100000000),
    conversionFeePercent: z.number().min(0).max(10),
    minimumWithdrawal: z.string().regex(/^\d+(\.\d{1,6})?$/),
    maximumWithdrawal: z.string().regex(/^\d+(\.\d{1,6})?$/),
  })
  .strict()
  .superRefine((x, ctx) => {
    const min = new Prisma.Decimal(x.minimumWithdrawal),
      max = new Prisma.Decimal(x.maximumWithdrawal);
    if (min.lte(0))
      ctx.addIssue({
        code: "custom",
        path: ["minimumWithdrawal"],
        message: "Minimum withdrawal must be positive",
      });
    if (max.lt(min))
      ctx.addIssue({
        code: "custom",
        path: ["maximumWithdrawal"],
        message: "Maximum withdrawal must be at least the minimum",
      });
  });
const output = (s: Awaited<ReturnType<typeof getWalletSettings>>) => ({
  currency: s.currency,
  pointsPerDollar: s.pointsPerDollar,
  minimumConversionPoints: s.minimumConversionPoints,
  conversionFeePercent: s.conversionFeeBps / 100,
  minimumWithdrawal: s.minimumWithdrawal.toFixed(2),
  maximumWithdrawal: s.maximumWithdrawal.toFixed(2),
});
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const a = await requireTenantAdmin((await params).tenantSlug);
    return Response.json(output(await getWalletSettings(a.miniAppId)));
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          { error: "Could not load Wallet settings", code: "INTERNAL_ERROR" },
          { status: 500 },
        );
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const a = await requireTenantAdmin((await params).tenantSlug);
    await requireRecentAdminElevation({ userId: a.userId, scopeType: "TENANT_ADMIN", miniAppId: a.miniAppId });
    rateLimit(`admin-wallet-settings:${a.userId}`);
    const i = tenantWalletSettingsSchema.parse(await request.json()),
      before = await getWalletSettings(a.miniAppId),
      saved = await prisma.$transaction(async (tx) => {
        const s = await tx.walletSettings.update({
          where: { miniAppId: a.miniAppId },
          data: {
            currency: i.currency,
            pointsPerDollar: i.pointsPerDollar,
            minimumConversionPoints: i.minimumConversionPoints,
            conversionFeeBps: Math.round(i.conversionFeePercent * 100),
            minimumWithdrawal: new Prisma.Decimal(i.minimumWithdrawal),
            maximumWithdrawal: new Prisma.Decimal(i.maximumWithdrawal),
            updatedById: a.userId,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "WALLET_BUSINESS_SETTINGS_UPDATED",
            targetType: "WalletSettings",
            targetId: s.id,
            before: output(before),
            after: output(s),
          },
        });
        return s;
      });
    return Response.json(output(saved));
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          {
            error: e instanceof Error ? e.message : "Invalid Wallet settings",
            code: "INVALID_WALLET_SETTINGS",
          },
          { status: 422 },
        );
  }
}
