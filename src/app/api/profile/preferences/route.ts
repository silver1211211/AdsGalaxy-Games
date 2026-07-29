import { requireSession } from "@/lib/session";
import { preferenceSchema } from "@/features/profile/profile";
import { ensureTenantProfile } from "@/features/profile/server";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

const select = {
  walletNotifications: true,
  withdrawalNotifications: true,
  rewardNotifications: true,
  taskNotifications: true,
  announcementNotifications: true,
  soundEnabled: true,
};
function publicPreferences(item: Record<keyof typeof select, boolean>) {
  return {
    walletRewardsNotifications:
      item.walletNotifications &&
      item.withdrawalNotifications &&
      item.rewardNotifications,
    taskUpdatesNotifications: item.taskNotifications,
    announcementsNotifications: item.announcementNotifications,
    soundEnabled: item.soundEnabled,
  };
}
export async function GET() {
  try {
    const auth = await requireSession();
    const item = await ensureTenantProfile(auth.miniAppId, auth.userId);
    return Response.json(publicPreferences(item));
  } catch (error) {
    return apiError(error, "Could not load preferences.");
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`preferences:${auth.userId}`);
    const input = preferenceSchema.parse(await request.json());
    const item = await ensureTenantProfile(auth.miniAppId, auth.userId);
    const data = {
      ...(input.walletRewardsNotifications === undefined
        ? {}
        : {
            walletNotifications: input.walletRewardsNotifications,
            withdrawalNotifications: input.walletRewardsNotifications,
            rewardNotifications: input.walletRewardsNotifications,
          }),
      ...(input.taskUpdatesNotifications === undefined
        ? {}
        : { taskNotifications: input.taskUpdatesNotifications }),
      ...(input.announcementsNotifications === undefined
        ? {}
        : { announcementNotifications: input.announcementsNotifications }),
      ...(input.soundEnabled === undefined
        ? {}
        : { soundEnabled: input.soundEnabled }),
    };
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.miniAppUserProfile.update({
        where: { id: item.id },
        data,
        select,
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "PROFILE_PREFERENCES_UPDATED",
          targetType: "MiniAppUserProfile",
          targetId: item.id,
          metadata: { fields: Object.keys(input) },
        },
      });
      return publicPreferences(result);
    });
    return Response.json(updated);
  } catch (error) {
    return apiError(error, "Preference update failed.");
  }
}
