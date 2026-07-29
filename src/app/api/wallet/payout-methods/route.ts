import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
export async function GET() {
  try {
    const auth = await requireSession();
    const rows = await prisma.walletPayoutMethod.findMany({
      where: {
        miniAppId: auth.miniAppId,
        enabled: true,
        archivedAt: null,
        provider: "OXAPAY",
        catalogNetwork: { isActive: true, currency: { isActive: true } },
      },
      include: { catalogNetwork: { include: { currency: true } } },
      orderBy: [{ currencySymbol: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({
      items: rows.map((m) => ({
        id: m.id,
        name: m.name,
        currency: m.currencySymbol,
        network: m.networkCode,
        networkName: m.catalogNetwork?.networkName,
        providerMinimum: m.catalogNetwork?.withdrawalMinimum.toString(),
        providerFee: m.catalogNetwork?.withdrawalFee.toString(),
        memoSupported: m.catalogNetwork?.memoSupported ?? false,
        automaticEligible: m.automaticEligible,
        minimumAmount: m.minimumAmount.toFixed(6),
        maximumAmount: m.maximumAmount.toFixed(6),
        fixedFee: m.fixedFee.toFixed(6),
        feeBasisPoints: m.feeBasisPoints,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: "Could not load payout methods" },
      { status: 400 },
    );
  }
}
