import { requireSession } from "@/lib/session";
import { profileStats } from "@/features/profile/server";
import { apiError } from "@/features/profile/security";

export async function GET() {
  try {
    const auth = await requireSession();
    return Response.json(await profileStats(auth.miniAppId, auth.userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error, "Could not load profile statistics.");
  }
}
