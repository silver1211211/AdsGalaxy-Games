import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getTaskSettings } from "@/features/tasks/server";
const schema = z
  .object({
    enabled: z.boolean(),
    pointsRewardsEnabled: z.boolean(),
    walletRewardsEnabled: z.boolean(),
    selfConfirmationEnabled: z.boolean(),
    manualProofEnabled: z.boolean(),
    maximumActiveTasks: z.number().int().min(0).max(1000),
    maximumWalletRewardTask: z.string(),
    maximumPointsRewardTask: z.number().int().min(0),
    userDailyWalletCap: z.string(),
    userDailyPointsCap: z.number().int().min(0),
    miniAppDailyBudget: z.string(),
    defaultEngagementSeconds: z.number().int().min(0).max(3600),
    proofRetentionDays: z.number().int().min(1).max(3650),
    emergencyDisabled: z.boolean(),
  })
  .strict();
const out = (s: Awaited<ReturnType<typeof getTaskSettings>>) => ({
  ...s,
  maximumWalletRewardTask: s.maximumWalletRewardTask.toFixed(6),
  userDailyWalletCap: s.userDailyWalletCap.toFixed(6),
  miniAppDailyBudget: s.miniAppDailyBudget.toFixed(6),
});
export async function GET() {
  try {
    const a = await requireAdmin();
    return NextResponse.json(out(await getTaskSettings(a.miniAppId)));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load settings" },
      { status: 400 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const a = await requireAdmin(),
      i = schema.parse(await request.json()),
      before = await getTaskSettings(a.miniAppId),
      saved = await prisma.$transaction(async (tx) => {
        const s = await tx.taskSettings.update({
          where: { miniAppId: a.miniAppId },
          data: {
            ...i,
            maximumWalletRewardTask: new Prisma.Decimal(
              i.maximumWalletRewardTask,
            ),
            userDailyWalletCap: new Prisma.Decimal(i.userDailyWalletCap),
            miniAppDailyBudget: new Prisma.Decimal(i.miniAppDailyBudget),
            updatedById: a.userId,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "TASK_SETTINGS_UPDATED",
            targetType: "TaskSettings",
            targetId: s.id,
            before: JSON.parse(JSON.stringify(out(before))),
            after: JSON.parse(JSON.stringify(i)),
          },
        });
        return s;
      });
    return NextResponse.json(out(saved));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save settings" },
      { status: 422 },
    );
  }
}
