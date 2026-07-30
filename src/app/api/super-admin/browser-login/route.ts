import { z } from "zod";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import {
  authenticateSuperAdminBrowser,
  GENERIC_LOGIN_ERROR,
  loginIdentifierHash,
  requestIpHash,
} from "@/features/super-admin/browser-auth";
import { browserLoginErrorMessage } from "@/features/super-admin/browser-auth-policy";

const schema = z.object({
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request, 2048);
    const input = schema.parse(await request.json());
    rateLimit(`super-admin-browser-ip:${requestIpHash(request)}`, 20, 15 * 60_000);
    rateLimit(
      `super-admin-browser-account:${loginIdentifierHash(process.env.SUPER_ADMIN_TELEGRAM_IDS ?? "unavailable")}`,
      8,
      15 * 60_000,
    );
    return Response.json(await authenticateSuperAdminBrowser({ password: input.password, request }));
  } catch (error) {
    if (error instanceof Response) {
      return Response.json(
        { error: browserLoginErrorMessage(error.status) },
        { status: error.status },
      );
    }
    return Response.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
  }
}
