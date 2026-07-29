import { z } from "zod";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

const schema = z
  .object({
    confirmation: z.literal("DELETE"),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();
const unresolved = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
] as const;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`deletion:${auth.userId}`, 3, 86_400_000);
    const input = schema.parse(await request.json());
    const [withdrawals, wallet, existing] = await Promise.all([
      prisma.withdrawal.count({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: { in: [...unresolved] },
        },
      }),
      prisma.wallet.findUnique({
        where: {
          miniAppId_userId: { miniAppId: auth.miniAppId, userId: auth.userId },
        },
      }),
      prisma.accountDeletionRequest.findFirst({
        where: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          status: "PENDING",
        },
      }),
    ]);
    if (withdrawals)
      return Response.json(
        {
          error:
            "Account deletion is blocked while a withdrawal is unresolved.",
          code: "UNRESOLVED_WITHDRAWAL",
        },
        { status: 409 },
      );
    if (existing)
      return Response.json({
        request: existing,
        warning:
          wallet && wallet.availableBalance.greaterThan(0)
            ? "Your available balance must be resolved before final deletion."
            : null,
      });
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.accountDeletionRequest.create({
        data: {
          miniAppId: auth.miniAppId,
          userId: auth.userId,
          reason: input.reason,
          executeAfter: new Date(Date.now() + 7 * 86_400_000),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "ACCOUNT_DELETION_REQUESTED",
          targetType: "AccountDeletionRequest",
          targetId: created.id,
        },
      });
      await tx.notification.create({
        data: {
          userId: auth.userId,
          type: "SYSTEM",
          title: "Account deletion requested",
          body: "Your tenant account is scheduled for deletion after the seven-day grace period.",
        },
      });
      return created;
    });
    return Response.json(
      {
        request: item,
        warning:
          wallet && wallet.availableBalance.greaterThan(0)
            ? "Your available balance must be resolved before final deletion."
            : null,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "Account deletion request failed.");
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`deletion:${auth.userId}`);
    const item = await prisma.accountDeletionRequest.findFirst({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        status: "PENDING",
        executeAfter: { gt: new Date() },
      },
    });
    if (!item)
      return Response.json(
        { error: "No cancellable deletion request was found." },
        { status: 404 },
      );
    await prisma.$transaction([
      prisma.accountDeletionRequest.update({
        where: { id: item.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "ACCOUNT_DELETION_CANCELLED",
          targetType: "AccountDeletionRequest",
          targetId: item.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: auth.userId,
          type: "SYSTEM",
          title: "Account deletion cancelled",
          body: "Your tenant account deletion request was cancelled.",
        },
      }),
    ]);
    return Response.json({ cancelled: true });
  } catch (error) {
    return apiError(error, "Could not cancel account deletion.");
  }
}
