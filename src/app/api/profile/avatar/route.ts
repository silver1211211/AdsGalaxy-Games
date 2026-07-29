import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`avatar:${auth.userId}`, 5, 3_600_000);
    return Response.json(
      {
        error:
          "Custom avatar storage is not configured. Telegram avatar or initials remain active.",
      },
      { status: 501 },
    );
  } catch (error) {
    return apiError(error, "Avatar upload failed.");
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`avatar:${auth.userId}`);
    const profile = await prisma.miniAppUserProfile.findUnique({
      where: {
        miniAppId_userId: { miniAppId: auth.miniAppId, userId: auth.userId },
      },
    });
    if (!profile?.customAvatarKey) return Response.json({ removed: false });
    return Response.json(
      {
        error:
          "Avatar storage deletion is unavailable until the controlled storage adapter is configured.",
      },
      { status: 501 },
    );
  } catch (error) {
    return apiError(error, "Avatar deletion failed.");
  }
}
