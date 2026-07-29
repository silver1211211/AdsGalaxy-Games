import { createHash } from "crypto";
import { z } from "zod";
import { verifyAndIssueAdminElevation } from "@/features/admin-security/elevation";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { requireTenantAdminIdentity } from "@/features/tenant-admin/auth";

const schema = z.object({ password: z.string().min(1).max(128) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    assertProtectedJsonRequest(request);
    const { tenantSlug } = await params;
    const auth = await requireTenantAdminIdentity(tenantSlug);
    const ipHash = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown").digest("hex").slice(0, 16);
    rateLimit(`admin-password:${auth.userId}:${auth.miniAppId}`, 8, 15 * 60_000);
    rateLimit(`admin-password-ip:${ipHash}:${auth.miniAppId}`, 20, 15 * 60_000);
    const input = schema.parse(await request.json());
    const result = await verifyAndIssueAdminElevation({
      userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId, password: input.password,
    });
    return Response.json({ ok: true, ...result, changePasswordPath: `/${tenantSlug}/administrator-security` });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Administrator verification failed." }, { status: 422 });
  }
}
