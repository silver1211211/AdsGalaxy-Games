import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";

export async function GET() {
  try {
    const auth = await requireSession();
    const items = await prisma.appSession.findMany({
      where: {
        miniAppId: auth.miniAppId,
        userId: auth.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastSeenAt: "desc" },
    });
    return Response.json(
      {
        items: items.map((item) => ({
          id: item.id,
          source: item.source,
          createdAt: item.createdAt,
          lastSeenAt: item.lastSeenAt,
          expiresAt: item.expiresAt,
          deviceLabel: item.deviceLabel ?? "Unknown device",
          current: item.id === auth.sessionId,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, "Could not load sessions.");
  }
}
