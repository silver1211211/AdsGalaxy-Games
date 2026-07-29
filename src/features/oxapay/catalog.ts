import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { automaticConversionPolicy, OXAPAY_API_BASE } from "./policy";

const networkSchema = z
  .object({
    network: z.string().min(1).max(64),
    name: z.string().min(1).max(100),
    required_confirmations: z.number().int().nonnegative().optional(),
    withdraw_fee: z.number().nonnegative(),
    withdraw_min: z.number().nonnegative(),
  })
  .passthrough();
const currencySchema = z
  .object({
    symbol: z.string().min(1).max(16),
    name: z.string().min(1).max(80),
    status: z.boolean(),
    networks: z.record(z.string(), networkSchema),
  })
  .passthrough();
const responseSchema = z
  .object({
    data: z.record(z.string(), currencySchema),
    status: z.number(),
    version: z.string().optional(),
  })
  .passthrough();

export async function synchronizeOxaPayCatalog(fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${OXAPAY_API_BASE}/common/currencies`, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("OXAPAY_UNAVAILABLE");
  const parsed = responseSchema.parse(await response.json());
  if (parsed.status !== 200) throw new Error("OXAPAY_CONNECTION_FAILED");
  const synchronizedAt = new Date();
  const symbols = Object.keys(parsed.data);
  await prisma.$transaction(async (tx) => {
    await tx.oxaPayCurrency.updateMany({
      where: { symbol: { notIn: symbols } },
      data: { isActive: false, synchronizedAt },
    });
    for (const item of Object.values(parsed.data)) {
      const currency = await tx.oxaPayCurrency.upsert({
        where: { symbol: item.symbol.toUpperCase() },
        create: {
          symbol: item.symbol.toUpperCase(),
          name: item.name,
          isActive: item.status,
          sourceVersion: parsed.version,
          synchronizedAt,
          rawMetadata: item as unknown as Prisma.InputJsonValue,
        },
        update: {
          name: item.name,
          isActive: item.status,
          sourceVersion: parsed.version,
          synchronizedAt,
          rawMetadata: item as unknown as Prisma.InputJsonValue,
        },
      });
      const networkCodes = Object.values(item.networks).map(
        (network) => network.network,
      );
      await tx.oxaPayCurrencyNetwork.updateMany({
        where: {
          currencyId: currency.id,
          networkCode: { notIn: networkCodes },
        },
        data: { isActive: false, synchronizedAt },
      });
      for (const network of Object.values(item.networks)) {
        await tx.oxaPayCurrencyNetwork.upsert({
          where: {
            currencyId_networkCode: {
              currencyId: currency.id,
              networkCode: network.network,
            },
          },
          create: {
            currencyId: currency.id,
            networkCode: network.network,
            networkName: network.name,
            isActive: item.status,
            withdrawalMinimum: new Prisma.Decimal(network.withdraw_min),
            withdrawalFee: new Prisma.Decimal(network.withdraw_fee),
            requiredConfirmations: network.required_confirmations,
            memoSupported: /ton|memo|tag/i.test(
              `${network.network} ${network.name}`,
            ),
            synchronizedAt,
            rawMetadata: network as unknown as Prisma.InputJsonValue,
          },
          update: {
            networkName: network.name,
            isActive: item.status,
            withdrawalMinimum: new Prisma.Decimal(network.withdraw_min),
            withdrawalFee: new Prisma.Decimal(network.withdraw_fee),
            requiredConfirmations: network.required_confirmations,
            memoSupported: /ton|memo|tag/i.test(
              `${network.network} ${network.name}`,
            ),
            synchronizedAt,
            rawMetadata: network as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
    await tx.platformIntegrationSettings.upsert({
      where: { id: "platform" },
      create: { id: "platform", oxaPayCatalogSynchronizedAt: synchronizedAt },
      update: { oxaPayCatalogSynchronizedAt: synchronizedAt },
    });
  });
  return { synchronizedAt, currencies: symbols.length };
}

export async function catalogForTenant(miniAppId: string) {
  const currencies = await prisma.oxaPayCurrency.findMany({
    include: {
      networks: {
        include: {
          payoutMethods: {
            where: { miniAppId },
            select: { id: true, enabled: true },
          },
        },
        orderBy: { networkName: "asc" },
      },
    },
    orderBy: { symbol: "asc" },
  });
  return currencies.map((currency) => ({
    symbol: currency.symbol,
    name: currency.name,
    active: currency.isActive,
    synchronizedAt: currency.synchronizedAt,
    networks: currency.networks.map((network) => ({
      id: network.id,
      code: network.networkCode,
      name: network.networkName,
      active: network.isActive,
      minimum: network.withdrawalMinimum.toString(),
      fee: network.withdrawalFee.toString(),
      confirmations: network.requiredConfirmations,
      memoSupported: network.memoSupported,
      automaticEligible: automaticConversionPolicy(currency.symbol).eligible,
      enabled: network.payoutMethods[0]?.enabled ?? false,
    })),
  }));
}
