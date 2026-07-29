import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
const schema = z
  .object({
    miniAppId: z
      .string()
      .trim()
      .regex(/^\d{3,32}$/),
  })
  .strict();
const masked = (v: string | null | undefined) =>
  v ? `${"•".repeat(Math.max(3, v.length - 4))}${v.slice(-4)}` : null;
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const a = await requireTenantAdmin((await params).tenantSlug),
      c = await prisma.adsGalaxyConfiguration.findUnique({
        where: { miniAppId: a.miniAppId },
      });
    return Response.json({
      configured: Boolean(c?.miniAppPublicId),
      maskedMiniAppId: masked(c?.miniAppPublicId),
      status: c?.status ?? "NOT_CONFIGURED",
    });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          { error: "Could not load Ads Galaxy status" },
          { status: 500 },
        );
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const a = await requireTenantAdmin((await params).tenantSlug);
    await requireRecentAdminElevation({ userId: a.userId, scopeType: "TENANT_ADMIN", miniAppId: a.miniAppId });
    rateLimit(`ads-id:${a.userId}`);
    const i = schema.parse(await request.json()),
      before = await prisma.adsGalaxyConfiguration.findUnique({
        where: { miniAppId: a.miniAppId },
      }),
      saved = await prisma.$transaction(async (tx) => {
        const c = await tx.adsGalaxyConfiguration.upsert({
          where: { miniAppId: a.miniAppId },
          create: {
            miniAppId: a.miniAppId,
            enabled: true,
            miniAppPublicId: i.miniAppId,
            status: "CONFIGURED",
            updatedById: a.userId,
          },
          update: {
            enabled: true,
            miniAppPublicId: i.miniAppId,
            status: "CONFIGURED",
            updatedById: a.userId,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "ADS_GALAXY_MINI_APP_ID_UPDATED",
            targetType: "AdsGalaxyConfiguration",
            targetId: c.id,
            before: {
              configured: Boolean(before?.miniAppPublicId),
              maskedMiniAppId: masked(before?.miniAppPublicId),
            },
            after: {
              configured: true,
              maskedMiniAppId: masked(c.miniAppPublicId),
            },
          },
        });
        return c;
      });
    return Response.json({
      configured: true,
      maskedMiniAppId: masked(saved.miniAppPublicId),
      status: saved.status,
    });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          {
            error: "Enter a valid numeric Mini App ID",
            code: "INVALID_ADS_GALAXY_ID",
          },
          { status: 422 },
        );
  }
}
