import { z } from "zod";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { loginIdentifierHash, requestIpHash } from "@/features/super-admin/browser-auth";
import {
  authenticateTenantAdministrator, TENANT_ADMIN_LOGIN_ERROR,
} from "@/features/tenant-admin/browser-auth";

const schema = z.object({ password: z.string().min(1).max(256) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    assertProtectedJsonRequest(request, 2048);
    const { tenantSlug } = await params;
    const input = schema.parse(await request.json());
    rateLimit(`tenant-admin-login-ip:${requestIpHash(request)}`, 20, 15 * 60_000);
    rateLimit(`tenant-admin-login:${loginIdentifierHash(tenantSlug)}`, 8, 15 * 60_000);
    return Response.json(await authenticateTenantAdministrator({ tenantSlug, password: input.password, request }));
  } catch (error) {
    if (error instanceof Response)
      return Response.json({ error: error.status === 429 ? "Too many login attempts. Try again later." : "Request could not be verified." }, { status: error.status });
    return Response.json({ error: TENANT_ADMIN_LOGIN_ERROR }, { status: 401 });
  }
}
