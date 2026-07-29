import { WithdrawalStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/features/profile/security";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { transitionTenantWithdrawal } from "@/features/tenant-admin/withdrawals";
const schema = z
  .object({
    status: z.nativeEnum(WithdrawalStatus),
    note: z.string().trim().min(3).max(500).optional(),
    externalId: z.string().trim().max(160).optional(),
  })
  .strict()
  .superRefine((x, ctx) => {
    if (x.status === "REJECTED" && !x.note)
      ctx.addIssue({
        code: "custom",
        message: "A rejection reason is required",
        path: ["note"],
      });
    if (x.status === "COMPLETED" && !x.externalId)
      ctx.addIssue({
        code: "custom",
        message: "An external payout reference is required",
        path: ["externalId"],
      });
  });
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; withdrawalId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { tenantSlug, withdrawalId } = await params,
      a = await requireTenantAdmin(tenantSlug),
      input = schema.parse(await request.json());
    return NextResponse.json(
      await transitionTenantWithdrawal({
        miniAppId: a.miniAppId,
        actorUserId: a.userId,
        withdrawalId,
        ...input,
      }),
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update withdrawal",
      },
      { status: 422 },
    );
  }
}
