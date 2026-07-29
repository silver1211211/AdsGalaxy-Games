import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/features/profile/profile";
import { safeProfile } from "@/features/profile/server";
import {
  apiError,
  assertSameOrigin,
  rateLimit,
} from "@/features/profile/security";

export async function GET() {
  try {
    const auth = await requireSession();
    return Response.json(await safeProfile(auth.miniAppId, auth.userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error, "Could not load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireSession();
    rateLimit(`profile:${auth.userId}`);
    const input = profileUpdateSchema.parse(await request.json());
    const before = await prisma.miniAppUserProfile.upsert({
      where: {
        miniAppId_userId: { miniAppId: auth.miniAppId, userId: auth.userId },
      },
      create: { miniAppId: auth.miniAppId, userId: auth.userId },
      update: {},
    });
    const data = {
      ...input,
      displayNameOverride: input.displayNameOverride || null,
      bio: input.bio || null,
    };
    await prisma.$transaction([
      prisma.miniAppUserProfile.update({ where: { id: before.id }, data }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "PROFILE_UPDATED",
          targetType: "MiniAppUserProfile",
          targetId: before.id,
          before: {
            displayNameOverride: before.displayNameOverride,
            bioPresent: Boolean(before.bio),
          },
          after: {
            displayNameOverride: data.displayNameOverride,
            bioPresent: Boolean(data.bio),
          },
        },
      }),
    ]);
    return Response.json(await safeProfile(auth.miniAppId, auth.userId));
  } catch (error) {
    return apiError(error, "Profile update failed.");
  }
}
