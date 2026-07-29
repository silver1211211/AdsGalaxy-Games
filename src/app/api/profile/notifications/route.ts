import { requireSession } from "@/lib/session";
import { ensureTenantProfile } from "@/features/profile/server";
import { apiError } from "@/features/profile/security";

export async function GET() {
  try {
    const auth = await requireSession();
    const item = await ensureTenantProfile(auth.miniAppId, auth.userId);
    return Response.json({
      walletRewardsNotifications:
        item.walletNotifications &&
        item.withdrawalNotifications &&
        item.rewardNotifications,
      taskUpdatesNotifications: item.taskNotifications,
      announcementsNotifications: item.announcementNotifications,
    });
  } catch (error) {
    return apiError(error, "Could not load notification preferences.");
  }
}
export async function PATCH(request: Request) {
  void request;
  return Response.json(
    { error: "Use the consolidated Preferences endpoint." },
    { status: 410 },
  );
}
