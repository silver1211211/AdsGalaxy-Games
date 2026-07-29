import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { automaticConversionPolicy } from "@/features/oxapay/policy";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({ networkId: z.string().cuid(), enabled: z.boolean() })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    rateLimit(`oxapay-assets:${auth.userId}`, 30, 60_000);
    const input = schema.parse(await request.json());
    const network = await prisma.oxaPayCurrencyNetwork.findUnique({
      where: { id: input.networkId },
      include: { currency: true },
    });
    if (!network || !network.isActive || !network.currency.isActive)
      return Response.json(
        {
          error: "This provider asset is unavailable.",
          code: "OXAPAY_ASSET_UNSUPPORTED",
        },
        { status: 422 },
      );
    const code = `OXAPAY:${network.currency.symbol}:${network.networkCode}`;
    const current = await prisma.walletPayoutMethod.findFirst({
      where: {
        miniAppId: auth.miniAppId,
        provider: "OXAPAY",
        currencySymbol: network.currency.symbol,
        networkCode: network.networkCode,
      },
    });
    const method = await prisma.$transaction(async (tx) => {
      const saved = await tx.walletPayoutMethod.upsert({
        where: { miniAppId_code: { miniAppId: auth.miniAppId, code } },
        create: {
          miniAppId: auth.miniAppId,
          code,
          name: `${network.currency.symbol} · ${network.networkName}`,
          instructions: "Confirm the network and destination carefully.",
          destinationLabel: "Wallet address",
          enabled: input.enabled,
          minimumAmount: 0,
          maximumAmount: 1_000_000,
          provider: "OXAPAY",
          currencySymbol: network.currency.symbol,
          networkCode: network.networkCode,
          catalogNetworkId: network.id,
          automaticEligible: automaticConversionPolicy(network.currency.symbol)
            .eligible,
        },
        update: {
          enabled: input.enabled,
          name: `${network.currency.symbol} · ${network.networkName}`,
          catalogNetworkId: network.id,
          automaticEligible: automaticConversionPolicy(network.currency.symbol)
            .eligible,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: input.enabled
            ? "OXAPAY_ASSET_ENABLED"
            : "OXAPAY_ASSET_DISABLED",
          targetType: "WalletPayoutMethod",
          targetId: saved.id,
          before: { enabled: current?.enabled ?? false },
          after: {
            enabled: input.enabled,
            currency: network.currency.symbol,
            network: network.networkCode,
          },
        },
      });
      return saved;
    });
    return Response.json({ id: method.id, enabled: method.enabled });
  } catch (error) {
    return error instanceof Response
      ? error
      : Response.json(
          { error: "Invalid payout asset.", code: "OXAPAY_ASSET_UNSUPPORTED" },
          { status: 422 },
        );
  }
}
