import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { reconcileOxaPayWithdrawal } from "@/features/oxapay/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; withdrawalId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { tenantSlug, withdrawalId } = await params;
    const auth = await requireTenantAdmin(tenantSlug);
    rateLimit(`oxapay-reconcile:${auth.userId}`, 10, 60_000);
    const withdrawal = await reconcileOxaPayWithdrawal(
      auth.miniAppId,
      withdrawalId,
    );
    return Response.json({
      id: withdrawal.id,
      status: withdrawal.status,
      providerStatus: withdrawal.providerStatus,
    });
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json(
          {
            error: "Provider status could not be refreshed.",
            code: "OXAPAY_CONNECTION_FAILED",
          },
          { status: 422 },
        );
  }
}
