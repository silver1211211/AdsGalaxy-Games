import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { getTenantAdminDashboard } from "@/features/tenant-admin/dashboard";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const auth = await requireTenantAdmin((await params).tenantSlug);
    return NextResponse.json(await getTenantAdminDashboard(auth.miniAppId));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load tenant dashboard" },
      { status: 500 },
    );
  }
}
