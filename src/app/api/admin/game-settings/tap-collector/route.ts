import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getTapSettings } from "@/features/tap-collector/server";
const schema = z.object({ coinPoints: z.number().int().min(1).max(1000), scheduledWalletAmount: z.string().regex(/^\d+(\.\d{1,6})?$/) });
const output = (s: Awaited<ReturnType<typeof getTapSettings>>) => ({ enabled: Boolean(s.enabled), coinPoints: Number(s.coinPoints), scheduledWalletAmount: s.scheduledWalletAmount.toFixed(2) });
export async function GET() {
  try { const auth = await requireAdmin(); return NextResponse.json(output(await getTapSettings(auth.miniAppId))); }
  catch (error) { if (error instanceof Response) return error; return NextResponse.json({ error: "Could not load settings" }, { status: 400 }); }
}
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin(), input = schema.parse(await request.json()), before = await getTapSettings(auth.miniAppId);
    const platform = await prisma.gamePlatformDefault.findUnique({ where: { gameKey: "tap-collector" } });
    const limits = (platform?.configuration ?? {}) as { coinRewardMin?: number; coinRewardMax?: number; moneyRewardMin?: number; moneyRewardMax?: number };
    const money = new Prisma.Decimal(input.scheduledWalletAmount);
    if (input.coinPoints < (limits.coinRewardMin ?? 1) || input.coinPoints > (limits.coinRewardMax ?? 1000)) throw new Error("Coin value is outside platform limits");
    if (money.lt(limits.moneyRewardMin ?? 0) || money.gt(limits.moneyRewardMax ?? 100)) throw new Error("Money value is outside platform limits");
    const saved = await prisma.$transaction(async (tx) => {
      const settings = await tx.tapCollectorSettings.update({ where: { miniAppId: auth.miniAppId },
        data: { coinPoints: input.coinPoints, scheduledWalletAmount: money, updatedById: auth.userId, version: { increment: 1 } } });
      await tx.adminAuditLog.create({ data: { miniAppId: auth.miniAppId, actorUserId: auth.userId, action: "CATCH_RUSH_REWARDS_UPDATED",
        targetType: "TapCollectorSettings", targetId: settings.id, before: output(before), after: input } });
      return settings;
    });
    return NextResponse.json(output(saved as Awaited<ReturnType<typeof getTapSettings>>));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save settings" }, { status: 422 });
  }
}
