import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const config = await prisma.adsGalaxyConfiguration.findUnique({
      where: { miniAppId: session.miniAppId },
    });
    return NextResponse.json(
      {
        enabled: Boolean(config?.enabled && config.miniAppPublicId),
        adsGalaxyMiniAppId: config?.enabled ? config.miniAppPublicId : null,
        mode: config?.environment ?? null,
        status: config?.status ?? "NOT_CONFIGURED",
        rewardAvailability:
          config?.environment === "PRODUCTION_VERIFIED"
            ? "PENDING_PROVIDER_VERIFICATION"
            : (config?.environment ?? "UNAVAILABLE"),
        configurationVersion: config?.updatedAt.getTime() ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Configuration unavailable" },
      { status: 400 },
    );
  }
}
