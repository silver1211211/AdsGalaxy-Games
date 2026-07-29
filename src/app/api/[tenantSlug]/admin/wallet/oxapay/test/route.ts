import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { testOxaPayConnection } from "@/features/oxapay/client";
import { decryptSecret } from "@/features/wallet/encryption";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    rateLimit(`oxapay-test:${auth.userId}`, 4, 60_000);
    const credential = await prisma.tenantOxaPayCredential.findUnique({
      where: { miniAppId: auth.miniAppId },
    });
    if (!credential)
      return Response.json(
        { error: "OxaPay is not connected.", code: "OXAPAY_NOT_CONFIGURED" },
        { status: 422 },
      );
    await testOxaPayConnection(
      decryptSecret(credential.payoutApiKeyEncrypted),
    );
    const now = new Date();
    await prisma.$transaction([
      prisma.tenantOxaPayCredential.update({
        where: { id: credential.id },
        data: { lastSuccessfulVerification: now },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "OXAPAY_CONNECTION_TESTED",
          targetType: "TenantOxaPayCredential",
          targetId: credential.id,
          metadata: { connected: true },
        },
      }),
    ]);
    return Response.json({ connected: true, checkedAt: now });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json(
      {
        connected: false,
        error: "OxaPay connection test failed.",
        code:
          error instanceof Error ? error.message : "OXAPAY_CONNECTION_FAILED",
      },
      { status: 422 },
    );
  }
}
