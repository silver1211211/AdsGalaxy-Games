import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
const money = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/)
  .refine(
    (v) => new Prisma.Decimal(v).gte(0) && new Prisma.Decimal(v).lte(10),
    "Reward is outside the platform range",
  );
const memory = z
  .object({
    moneyRewardEnabled: z.boolean(),
    moneyRewardAmount: money,
    coinRewardEnabled: z.boolean(),
    minimumCoinReward: z.number().int().min(1).max(100000),
    maximumCoinReward: z.number().int().min(1).max(100000),
  })
  .strict()
  .refine((x) => x.minimumCoinReward <= x.maximumCoinReward, {
    path: ["minimumCoinReward"],
    message: "Minimum cannot exceed maximum",
  });
const wallet = z
  .object({ walletRewardEnabled: z.boolean(), walletRewardAmount: money })
  .strict();
const maze = z.object({
  baseCompletionPoints: z.number().int().min(0).max(10000),
  collectiblePoints: z.number().int().min(0).max(1000),
  bonusChestPoints: z.number().int().min(0).max(5000),
}).strict();
function gameKey(value: string) {
  if (!["memory-match", "quiz-challenge", "tap-collector", "maze-runner"].includes(value))
    throw new Response("Not found", { status: 404 });
  return value;
}
async function read(miniAppId: string, key: string) {
  if (key === "memory-match") {
    const s = await prisma.memoryMatchSettings.findUniqueOrThrow({
      where: { miniAppId },
    });
    return {
      moneyRewardEnabled: s.moneyMatchEnabled,
      moneyRewardAmount: s.moneyRewardAmount.toFixed(2),
      coinRewardEnabled: s.coinMatchEnabled,
      minimumCoinReward: s.coinMultiplierMin,
      maximumCoinReward: s.coinMultiplierMax,
    };
  }
  if (key === "quiz-challenge") {
    const s = await prisma.quizSettings.findUniqueOrThrow({
      where: { miniAppId },
    });
    return {
      walletRewardEnabled: s.scheduledWalletEnabled,
      walletRewardAmount: s.scheduledWalletAmount.toFixed(2),
    };
  }
  if (key === "maze-runner") {
    const s = await prisma.mazeRunnerSettings.upsert({ where: { miniAppId }, create: { miniAppId }, update: {} });
    return { baseCompletionPoints: s.baseCompletionPoints, collectiblePoints: s.collectiblePoints, bonusChestPoints: s.bonusChestPoints };
  }
  const s = await prisma.tapCollectorSettings.findUniqueOrThrow({
    where: { miniAppId },
  });
  return {
    walletRewardEnabled: s.scheduledWalletEnabled,
    walletRewardAmount: s.scheduledWalletAmount.toFixed(2),
  };
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; gameKey: string }> },
) {
  try {
    const p = await params,
      a = await requireTenantAdmin(p.tenantSlug),
      key = gameKey(p.gameKey);
    return Response.json(await read(a.miniAppId, key));
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json({ error: "Could not load rewards" }, { status: 500 });
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; gameKey: string }> },
) {
  try {
    assertSameOrigin(request);
    const p = await params,
      a = await requireTenantAdmin(p.tenantSlug),
      key = gameKey(p.gameKey);
    await requireRecentAdminElevation({ userId: a.userId, scopeType: "TENANT_ADMIN", miniAppId: a.miniAppId });
    rateLimit(`game-rewards:${a.userId}`);
    const before = await read(a.miniAppId, key),
      input =
        key === "memory-match"
          ? memory.parse(await request.json())
          : key === "maze-runner" ? maze.parse(await request.json()) : wallet.parse(await request.json());
    await prisma.$transaction(async (tx) => {
      if (key === "memory-match") {
        const x = input as z.infer<typeof memory>;
        await tx.memoryMatchSettings.update({
          where: { miniAppId: a.miniAppId },
          data: {
            moneyMatchEnabled: x.moneyRewardEnabled,
            moneyRewardAmount: new Prisma.Decimal(x.moneyRewardAmount),
            coinMatchEnabled: x.coinRewardEnabled,
            coinMultiplierMin: x.minimumCoinReward,
            coinMultiplierMax: x.maximumCoinReward,
            updatedById: a.userId,
          },
        });
      } else if (key === "quiz-challenge") {
        const x = input as z.infer<typeof wallet>;
        await tx.quizSettings.update({
          where: { miniAppId: a.miniAppId },
          data: {
            scheduledWalletEnabled: x.walletRewardEnabled,
            scheduledWalletAmount: new Prisma.Decimal(x.walletRewardAmount),
            updatedById: a.userId,
          },
        });
      } else if (key === "tap-collector") {
        const x = input as z.infer<typeof wallet>;
        await tx.tapCollectorSettings.update({
          where: { miniAppId: a.miniAppId },
          data: {
            scheduledWalletEnabled: x.walletRewardEnabled,
            scheduledWalletAmount: new Prisma.Decimal(x.walletRewardAmount),
            updatedById: a.userId,
            version: { increment: 1 },
          },
        });
      } else {
        const x = input as z.infer<typeof maze>;
        await tx.mazeRunnerSettings.update({
          where: { miniAppId: a.miniAppId },
          data: { baseCompletionPoints: x.baseCompletionPoints, collectiblePoints: x.collectiblePoints,
            bonusChestPoints: x.bonusChestPoints, updatedById: a.userId },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: `${key.toUpperCase().replaceAll("-", "_")}_REWARDS_UPDATED`,
          targetType: "GameRewardSettings",
          before,
          after: input,
        },
      });
    });
    return Response.json(await read(a.miniAppId, key));
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          {
            error: e instanceof Error ? e.message : "Invalid reward",
            code: "INVALID_REWARD",
          },
          { status: 422 },
        );
  }
}
