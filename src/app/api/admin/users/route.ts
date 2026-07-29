import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";
import { effectiveDisplayName } from "@/features/profile/profile";
export async function GET(request: Request) {
  try {
    const a = await requireAdmin(),
      q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 64);
    const items = await prisma.miniAppMembership.findMany({
      where: {
        miniAppId: a.miniAppId,
        ...(q
          ? {
              user: {
                OR: [
                  { username: { contains: q, mode: "insensitive" } },
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      include: { user: true, miniApp: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    const profiles = await prisma.miniAppUserProfile.findMany({
      where: {
        miniAppId: a.miniAppId,
        userId: { in: items.map((x) => x.userId) },
      },
    });
    return Response.json({
      items: items.map((x) => {
        const p = profiles.find((y) => y.userId === x.userId);
        return {
          id: x.userId,
          displayName: effectiveDisplayName(p?.displayNameOverride, x.user),
          username: x.user.username,
          role: x.role,
          membershipStatus: x.status,
          accountStatus: x.user.status,
          joinedAt: x.createdAt,
        };
      }),
    });
  } catch (e) {
    return apiError(e, "Could not load users.");
  }
}
