import { NextResponse } from "next/server";
import { getPreviewSession } from "@/lib/development-preview/context";
import { previewDashboard } from "@/lib/development-preview/data";
export async function GET(request: Request) {
  const session = await getPreviewSession(request.headers.get("host"));
  if (!session) return new NextResponse(null, { status: 404 });
  return NextResponse.json({
    mode: "DEVELOPMENT_PREVIEW",
    dashboard: { ...previewDashboard, role: session.role },
    databaseAvailable: false,
    persistenceAvailable: false,
    rewardsAvailable: false,
    realAdsAvailable: false,
  });
}
