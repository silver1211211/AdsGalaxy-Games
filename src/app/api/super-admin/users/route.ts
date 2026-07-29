import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";
export async function GET(r: Request) {
  try {
    await requireSuperAdmin();
    const q = new URL(r.url).searchParams.get("q")?.trim().slice(0, 64);
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        memberships: {
          select: {
            miniAppId: true,
            role: true,
            status: true,
            miniApp: { select: { name: true, slug: true } },
          },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ items: users });
  } catch (e) {
    return apiError(e, "Could not load global users.");
  }
}
