import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
const button = z
  .object({
    id: z.string().uuid(),
    label: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[^<>\u0000-\u001f]+$/),
    url: z
      .string()
      .max(500)
      .refine((value) => {
        try {
          const u = new URL(value);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      }, "Use a safe HTTPS or Telegram URL"),
  })
  .strict();
const tenantBusinessSettingsSchema = z
  .object({
    startMessage: z
      .string()
      .max(4000)
      .refine((v) => !/<\/?[a-z][\s\S]*>/i.test(v), "HTML is not supported")
      .nullable(),
    miniAppButtonText: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[^<>\u0000-\u001f]+$/),
    inlineButtons: z.array(button).max(6),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().trim().max(300).nullable(),
  })
  .strict()
  .superRefine((x, ctx) => {
    if (x.maintenanceMode && !x.maintenanceMessage)
      ctx.addIssue({
        code: "custom",
        path: ["maintenanceMessage"],
        message: "Add a maintenance message before enabling maintenance mode.",
      });
  });
const output = (s: any) => ({
  startMessage:
    s?.startMessage ??
    s?.description ??
    "Welcome! Open the Mini App to play games, complete tasks, and earn rewards.",
  miniAppButtonText: s?.miniAppButtonText ?? "Open Mini App",
  inlineButtons: Array.isArray(s?.inlineButtons) ? s.inlineButtons : [],
  maintenanceMode: s?.maintenanceMode ?? false,
  maintenanceMessage: s?.maintenanceMessage ?? null,
  startImageConfigured: Boolean(s?.startImageData),
});
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const a = await requireTenantAdmin((await params).tenantSlug),
      s = await prisma.tenantAdminSettings.findUnique({
        where: { miniAppId: a.miniAppId },
      });
    return NextResponse.json(output(s));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load settings", code: "INTERNAL_ERROR" },
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
    rateLimit(`admin-settings:${a.userId}`);
    const input = tenantBusinessSettingsSchema.parse(await request.json()),
      before = await prisma.tenantAdminSettings.findUnique({
        where: { miniAppId: a.miniAppId },
      }),
      saved = await prisma.$transaction(async (tx) => {
        const s = await tx.tenantAdminSettings.upsert({
          where: { miniAppId: a.miniAppId },
          create: { miniAppId: a.miniAppId, ...input, updatedById: a.userId },
          update: { ...input, updatedById: a.userId },
        });
        await tx.adminAuditLog.create({
          data: {
            miniAppId: a.miniAppId,
            actorUserId: a.userId,
            action: "ADMIN_SETTINGS_UPDATED",
            targetType: "TenantAdminSettings",
            targetId: s.id,
            before: before ? output(before) : undefined,
            after: output(s),
          },
        });
        return s;
      });
    return NextResponse.json(output(saved));
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not save settings",
        code: "INVALID_MAINTENANCE_SETTINGS",
      },
      { status: 422 },
    );
  }
}
