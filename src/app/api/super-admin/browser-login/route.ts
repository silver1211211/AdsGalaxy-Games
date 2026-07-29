import { z } from "zod";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import {
  authenticateSuperAdminBrowser,
  GENERIC_LOGIN_ERROR,
  loginIdentifierHash,
  requestIpHash,
} from "@/features/super-admin/browser-auth";

const schema = z.object({
  identifier: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  try {
    assertProtectedJsonRequest(request, 2048);
    const input = schema.parse(await request.json());
    rateLimit(`super-admin-browser-ip:${requestIpHash(request)}`, 20, 15 * 60_000);
    rateLimit(
      `super-admin-browser-id:${loginIdentifierHash(input.identifier)}`,
      8,
      15 * 60_000,
    );
    return Response.json(await authenticateSuperAdminBrowser({ ...input, request }));
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 429)
        return Response.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
      return error;
    }
    return Response.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
  }
}
