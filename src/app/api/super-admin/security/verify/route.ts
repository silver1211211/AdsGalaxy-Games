import { createHash } from "crypto";
import { z } from "zod";
import { verifyAndIssueAdminElevation } from "@/features/admin-security/elevation";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { requireSuperAdminIdentity } from "@/lib/session";

const schema = z.object({ password: z.string().min(1).max(128) }).strict();
export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request);
    const auth = await requireSuperAdminIdentity();
    const ipHash = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown").digest("hex").slice(0, 16);
    rateLimit(`super-password:${auth.userId}`, 8, 15 * 60_000);
    rateLimit(`super-password-ip:${ipHash}`, 20, 15 * 60_000);
    const input = schema.parse(await request.json());
    const result = await verifyAndIssueAdminElevation({ userId: auth.userId, scopeType: "SUPER_ADMIN", password: input.password });
    return Response.json({ ok: true, ...result, changePasswordPath: "/super-admin-security" });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Super Admin verification failed." }, { status: 422 });
  }
}
