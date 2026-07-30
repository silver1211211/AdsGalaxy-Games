import { prisma } from "@/lib/prisma";
import { isValidTenantSlug } from "@/features/tenant-admin/boundary";

export async function GET(_: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  if (!isValidTenantSlug(tenantSlug)) return new Response(null, { status: 404 });
  const tenant = await prisma.miniApp.findFirst({
    where: { slug: tenantSlug, status: "ACTIVE" },
    select: {
      adminSettings: {
        select: { maintenanceMode: true, startImageData: true, startImageMime: true, startImageKey: true },
      },
    },
  });
  const image = tenant?.adminSettings;
  if (image?.maintenanceMode || !image?.startImageData || !image.startImageMime || !image.startImageKey)
    return new Response(null, { status: 404 });
  return new Response(image.startImageData, {
    headers: {
      "Content-Type": image.startImageMime,
      "Cache-Control": "public, max-age=300, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
