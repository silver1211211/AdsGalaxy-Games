import { requireAdmin } from "@/lib/session";
import { safeProfile } from "@/features/profile/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/features/profile/security";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const a = await requireAdmin(),
      { userId } = await params;
    const member = await prisma.miniAppMembership.findUnique({
      where: { miniAppId_userId: { miniAppId: a.miniAppId, userId } },
    });
    if (!member)
      return Response.json({ error: "User not found." }, { status: 404 });
    return Response.json(await safeProfile(a.miniAppId, userId));
  } catch (e) {
    return apiError(e, "Could not load user.");
  }
}
