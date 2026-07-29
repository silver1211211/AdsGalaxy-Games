import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { synchronizeOxaPayCatalog } from "@/features/oxapay/catalog";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    rateLimit(`oxapay-sync:${auth.userId}`, 2, 60_000);
    const result = await synchronizeOxaPayCatalog();
    await prisma.adminAuditLog.create({
      data: {
        miniAppId: auth.miniAppId,
        actorUserId: auth.userId,
        action: "OXAPAY_CATALOG_SYNCHRONIZED",
        targetType: "OxaPayCurrency",
        metadata: {
          currencies: result.currencies,
          synchronizedAt: result.synchronizedAt,
        },
      },
    });
    return Response.json(result);
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json(
          {
            error: "The last valid catalog is still available.",
            code: "OXAPAY_UNAVAILABLE",
          },
          { status: 503 },
        );
  }
}
