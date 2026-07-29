import { randomUUID } from "crypto";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { avatarMimeAllowed } from "@/features/profile/profile";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { prisma } from "@/lib/prisma";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const a = await requireTenantAdmin((await params).tenantSlug),
      s = await prisma.tenantAdminSettings.findUnique({
        where: { miniAppId: a.miniAppId },
        select: { startImageData: true, startImageMime: true },
      });
    if (!s?.startImageData || !s.startImageMime)
      return new Response(null, { status: 404 });
    return new Response(s.startImageData, {
      headers: {
        "Content-Type": s.startImageMime,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return e instanceof Response ? e : new Response(null, { status: 500 });
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const a = await requireTenantAdmin((await params).tenantSlug);
    rateLimit(`start-image:${a.userId}`);
    const file = (await request.formData()).get("image");
    if (!(file instanceof File) || file.size < 1 || file.size > 3 * 1024 * 1024)
      return Response.json(
        { error: "Choose an image up to 3 MB.", code: "INVALID_IMAGE" },
        { status: 422 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!avatarMimeAllowed(bytes, file.type))
      return Response.json(
        {
          error: "Only valid PNG, JPEG, or WEBP images are accepted.",
          code: "INVALID_IMAGE",
        },
        { status: 422 },
      );
    const saved = await prisma.$transaction(async (tx) => {
      const s = await tx.tenantAdminSettings.upsert({
        where: { miniAppId: a.miniAppId },
        create: {
          miniAppId: a.miniAppId,
          startImageKey: randomUUID(),
          startImageData: Buffer.from(bytes),
          startImageMime: file.type,
          updatedById: a.userId,
        },
        update: {
          startImageKey: randomUUID(),
          startImageData: Buffer.from(bytes),
          startImageMime: file.type,
          updatedById: a.userId,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "START_IMAGE_UPDATED",
          targetType: "TenantAdminSettings",
          targetId: s.id,
        },
      });
      return s;
    });
    return Response.json({ configured: Boolean(saved.startImageData) });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json(
          { error: "Image upload failed.", code: "INTERNAL_ERROR" },
          { status: 422 },
        );
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const a = await requireTenantAdmin((await params).tenantSlug);
    await prisma.$transaction([
      prisma.tenantAdminSettings.update({
        where: { miniAppId: a.miniAppId },
        data: {
          startImageKey: null,
          startImageData: null,
          startImageMime: null,
          updatedById: a.userId,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: "START_IMAGE_REMOVED",
          targetType: "TenantAdminSettings",
        },
      }),
    ]);
    return Response.json({ configured: false });
  } catch (e) {
    return e instanceof Response
      ? e
      : Response.json({ error: "Could not remove image." }, { status: 422 });
  }
}
