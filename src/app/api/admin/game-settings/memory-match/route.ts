import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/session";
import { getMemorySettings } from "@/features/memory-match/server";

const decimalString = z.string().regex(/^\d{1,6}(\.\d{1,6})?$/);
const schema = z
  .object({
    targetMiniAppId: z.string().optional(),
    enabled: z.boolean(),
    specialCardsEnabled: z.boolean(),
    moneyMatchEnabled: z.boolean(),
    coinMatchEnabled: z.boolean(),
    rewardedAdsEnabled: z.boolean(),
    emergencyDisabled: z.boolean(),
    moneyRewardAmount: decimalString,
    moneyRewardMin: decimalString,
    moneyRewardMax: decimalString,
    coinMultiplierMin: z
      .number()
      .int()
      .refine((v) => [1200, 1300, 1400, 1500].includes(v)),
    coinMultiplierMax: z
      .number()
      .int()
      .refine((v) => [1200, 1300, 1400, 1500].includes(v)),
    coinProbabilityEarly: z.number().int().min(0).max(100),
    optionAWeight: z.number().int().min(0).max(100),
    optionBWeight: z.number().int().min(0).max(100),
    optionCWeight: z.number().int().min(0).max(100),
    moneyRepeatPolicy: z.enum(["ONCE_EVER", "DAILY", "WEEKLY"]),
    coinRepeatPolicy: z.enum(["ONCE_EVER", "DAILY", "WEEKLY"]),
    maxMoneyClaimsUserDay: z.number().int().min(0).max(100),
    maxCoinClaimsUserDay: z.number().int().min(0).max(100),
    maxWalletUserDay: decimalString,
    maxWalletMiniAppDay: decimalString,
    retryCooldownSeconds: z.number().int().min(15).max(86400),
    maxAdRetries: z.number().int().min(1).max(20),
    pendingExpiryMinutes: z.number().int().min(5).max(10080),
    adsEnabled: z.boolean(),
    adsMiniAppId: z.string().regex(/^\d+$/).or(z.literal("")),
    adsEnvironment: z.enum([
      "PRODUCTION_VERIFIED",
      "SANDBOX",
      "DEVELOPMENT_MOCK",
    ]),
  })
  .superRefine((data, ctx) => {
    if (data.coinMultiplierMin > data.coinMultiplierMax)
      ctx.addIssue({
        code: "custom",
        path: ["coinMultiplierMin"],
        message: "Minimum cannot exceed maximum",
      });
    if (data.optionAWeight + data.optionBWeight + data.optionCWeight !== 100)
      ctx.addIssue({
        code: "custom",
        path: ["optionAWeight"],
        message: "Option weights must total 100%",
      });
    if (
      new Prisma.Decimal(data.moneyRewardAmount).lt(data.moneyRewardMin) ||
      new Prisma.Decimal(data.moneyRewardAmount).gt(data.moneyRewardMax)
    )
      ctx.addIssue({
        code: "custom",
        path: ["moneyRewardAmount"],
        message: "Reward must be within its configured range",
      });
    if (
      data.adsEnvironment === "DEVELOPMENT_MOCK" &&
      process.env.NODE_ENV === "production"
    )
      ctx.addIssue({
        code: "custom",
        path: ["adsEnvironment"],
        message: "Development mock is forbidden in production",
      });
  });

function json(
  settings: Awaited<ReturnType<typeof getMemorySettings>>,
  ads: Awaited<ReturnType<typeof prisma.adsGalaxyConfiguration.findUnique>>,
) {
  return {
    ...settings,
    moneyRewardAmount: settings.moneyRewardAmount.toFixed(2),
    moneyRewardMin: settings.moneyRewardMin.toFixed(2),
    moneyRewardMax: settings.moneyRewardMax.toFixed(2),
    maxWalletUserDay: settings.maxWalletUserDay.toFixed(2),
    maxWalletMiniAppDay: settings.maxWalletMiniAppDay.toFixed(2),
    adsEnabled: ads?.enabled ?? false,
    adsMiniAppId: ads?.miniAppPublicId ?? "",
    adsEnvironment: ads?.environment ?? "PRODUCTION_VERIFIED",
    adsStatus: ads?.status ?? "NOT_CONFIGURED",
    lastSuccessfulAdAt: ads?.lastSuccessfulAdAt,
    lastErrorCode: ads?.lastErrorCode,
    lastErrorMessage: ads?.lastErrorMessage,
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const requested = new URL(request.url).searchParams.get("miniAppId");
    const miniAppId =
      session.role === "SUPER_ADMIN" && requested
        ? requested
        : session.miniAppId;
    const [settings, ads] = await Promise.all([
      getMemorySettings(miniAppId),
      prisma.adsGalaxyConfiguration.findUnique({ where: { miniAppId } }),
    ]);
    return NextResponse.json(json(settings, ads));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load settings" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const input = schema.parse(await request.json());
    const miniAppId =
      session.role === "SUPER_ADMIN" && input.targetMiniAppId
        ? input.targetMiniAppId
        : session.miniAppId;
    const before = await getMemorySettings(miniAppId);
    const [settings, ads] = await prisma.$transaction(async (tx) => {
      const saved = await tx.memoryMatchSettings.update({
        where: { miniAppId },
        data: {
          enabled: input.enabled,
          specialCardsEnabled: input.specialCardsEnabled,
          moneyMatchEnabled: input.moneyMatchEnabled,
          coinMatchEnabled: input.coinMatchEnabled,
          rewardedAdsEnabled: input.rewardedAdsEnabled,
          emergencyDisabled: input.emergencyDisabled,
          moneyRewardAmount: new Prisma.Decimal(input.moneyRewardAmount),
          moneyRewardMin: new Prisma.Decimal(input.moneyRewardMin),
          moneyRewardMax: new Prisma.Decimal(input.moneyRewardMax),
          coinMultiplierMin: input.coinMultiplierMin,
          coinMultiplierMax: input.coinMultiplierMax,
          coinProbabilityEarly: input.coinProbabilityEarly,
          optionAWeight: input.optionAWeight,
          optionBWeight: input.optionBWeight,
          optionCWeight: input.optionCWeight,
          moneyRepeatPolicy: input.moneyRepeatPolicy,
          coinRepeatPolicy: input.coinRepeatPolicy,
          maxMoneyClaimsUserDay: input.maxMoneyClaimsUserDay,
          maxCoinClaimsUserDay: input.maxCoinClaimsUserDay,
          maxWalletUserDay: new Prisma.Decimal(input.maxWalletUserDay),
          maxWalletMiniAppDay: new Prisma.Decimal(input.maxWalletMiniAppDay),
          retryCooldownSeconds: input.retryCooldownSeconds,
          maxAdRetries: input.maxAdRetries,
          pendingExpiryMinutes: input.pendingExpiryMinutes,
          updatedById: session.userId,
        },
      });
      const ad = await tx.adsGalaxyConfiguration.upsert({
        where: { miniAppId },
        create: {
          miniAppId,
          enabled: input.adsEnabled,
          miniAppPublicId: input.adsMiniAppId || null,
          environment: input.adsEnvironment,
          status: input.adsMiniAppId ? "CONFIGURED" : "NOT_CONFIGURED",
          updatedById: session.userId,
        },
        update: {
          enabled: input.adsEnabled,
          miniAppPublicId: input.adsMiniAppId || null,
          environment: input.adsEnvironment,
          status: input.adsMiniAppId ? "CONFIGURED" : "NOT_CONFIGURED",
          updatedById: session.userId,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId,
          actorUserId: session.userId,
          action: "MEMORY_MATCH_SETTINGS_UPDATED",
          targetType: "MemoryMatchSettings",
          targetId: saved.id,
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(input)),
        },
      });
      return [saved, ad] as const;
    });
    return NextResponse.json(json(settings, ads));
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid settings", issues: error.issues },
        { status: 422 },
      );
    return NextResponse.json(
      { error: "Could not save settings" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSuperAdmin();
    const miniAppId = new URL(request.url).searchParams.get("miniAppId");
    if (!miniAppId)
      return NextResponse.json(
        { error: "miniAppId is required" },
        { status: 422 },
      );
    await prisma.$transaction(async (tx) => {
      const before = await tx.memoryMatchSettings.findUnique({
        where: { miniAppId },
      });
      await tx.memoryMatchSettings.deleteMany({ where: { miniAppId } });
      await tx.memoryMatchSettings.create({
        data: { miniAppId, updatedById: session.userId },
      });
      await tx.adsGalaxyConfiguration.deleteMany({ where: { miniAppId } });
      await tx.adminAuditLog.create({
        data: {
          miniAppId,
          actorUserId: session.userId,
          action: "MEMORY_MATCH_SETTINGS_RESET",
          targetType: "MemoryMatchSettings",
          before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        },
      });
    });
    return NextResponse.json({ reset: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not reset settings" },
      { status: 400 },
    );
  }
}
