import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitDataContext } from "@/lib/telegram-auth";
import { decryptSecret } from "@/features/wallet/encryption";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
  sessionIdentifierHash,
} from "@/lib/session";
import { deviceLabel } from "@/features/profile/profile";
import { telegramTenantContextMatches } from "@/features/tenant-admin/tenant-launch";

const inputSchema = z.object({
  initData: z.string().min(1),
  miniAppSlug: z.string().regex(/^[a-z0-9-]{3,64}$/),
});

function superAdminIds() {
  return new Set(
    (process.env.SUPER_ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const miniApp = await prisma.miniApp.findUnique({
      where: { slug: input.miniAppSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        botConfiguration: {
          select: { tokenEncrypted: true, validationStatus: true },
        },
      },
    });
    if (!miniApp || miniApp.status !== "ACTIVE")
      return NextResponse.json(
        { error: "Telegram tenant unavailable" },
        { status: 404 },
      );
    if (
      !miniApp.botConfiguration ||
      miniApp.botConfiguration.validationStatus !== "VALIDATED"
    )
      return NextResponse.json(
        { error: "Authentication unavailable" },
        { status: 503 },
      );
    let token: string;
    try {
      token = decryptSecret(miniApp.botConfiguration.tokenEncrypted);
    } catch {
      return NextResponse.json(
        { error: "Authentication unavailable" },
        { status: 503 },
      );
    }
    const validated = validateTelegramInitDataContext(input.initData, token);
    token = "";
    const platformSlug = process.env.PLATFORM_MINI_APP_SLUG ?? "ads-galaxy";
    if (!telegramTenantContextMatches(miniApp.slug, validated.startParam))
      return NextResponse.json(
        { error: "Invalid Telegram launch context" },
        { status: 401 },
      );
    const telegram = validated.user;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { telegramId: BigInt(telegram.id) },
        create: {
          telegramId: BigInt(telegram.id),
          username: telegram.username,
          firstName: telegram.first_name,
          lastName: telegram.last_name,
          language: telegram.language_code,
          avatar: telegram.photo_url,
          telegramPremium: telegram.is_premium,
          telegramSyncedAt: new Date(),
          referralCode: crypto
            .randomUUID()
            .replaceAll("-", "")
            .slice(0, 12)
            .toUpperCase(),
        },
        update: {
          username: telegram.username,
          firstName: telegram.first_name,
          lastName: telegram.last_name,
          language: telegram.language_code,
          avatar: telegram.photo_url,
          telegramPremium: telegram.is_premium,
          telegramSyncedAt: new Date(),
        },
      });
      const mayBecomeSuperAdmin =
        miniApp.slug === platformSlug &&
        superAdminIds().has(String(telegram.id));
      const existingMembership = await tx.miniAppMembership.findUnique({
        where: { miniAppId_userId: { miniAppId: miniApp.id, userId: user.id } },
        select: { role: true, status: true },
      });
      if (existingMembership?.status === "SUSPENDED")
        throw new Error("MEMBERSHIP_INACTIVE");
      const role = mayBecomeSuperAdmin
        ? ("SUPER_ADMIN" as const)
        : (existingMembership?.role ?? "USER");
      const membership = await tx.miniAppMembership.upsert({
        where: { miniAppId_userId: { miniAppId: miniApp.id, userId: user.id } },
        create: { miniAppId: miniApp.id, userId: user.id, role },
        update: mayBecomeSuperAdmin ? { role: "SUPER_ADMIN" } : {},
      });
      await tx.wallet.upsert({
        where: { miniAppId_userId: { miniAppId: miniApp.id, userId: user.id } },
        create: { miniAppId: miniApp.id, userId: user.id },
        update: {},
      });
      await tx.memoryMatchSettings.upsert({
        where: { miniAppId: miniApp.id },
        create: { miniAppId: miniApp.id },
        update: {},
      });
      await Promise.all([
        tx.tenantAdminSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.quizSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.tapCollectorSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.mazeRunnerSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.walletSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.taskSettings.upsert({
          where: { miniAppId: miniApp.id },
          create: { miniAppId: miniApp.id },
          update: {},
        }),
        tx.adsGalaxyConfiguration.upsert({
          where: { miniAppId: miniApp.id },
          create: {
            miniAppId: miniApp.id,
            enabled: false,
            status: "NOT_CONFIGURED",
          },
          update: {},
        }),
      ]);
      return { user, miniApp, membership };
    });
    const sessionId = crypto.randomUUID();
    await prisma.appSession.create({
      data: {
        id: sessionId,
        miniAppId: result.miniApp.id,
        userId: result.user.id,
        membershipId: result.membership.id,
        tokenHash: sessionIdentifierHash(sessionId),
        source: "TELEGRAM",
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        userAgentSummary: request.headers.get("user-agent")?.slice(0, 120),
        deviceLabel: deviceLabel(request.headers.get("user-agent")),
      },
    });
    const sessionToken = createSessionToken({
      userId: result.user.id,
      miniAppId: result.miniApp.id,
      membershipId: result.membership.id,
      role: result.membership.role,
      sessionId,
    });
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        username: result.user.username,
        avatar: result.user.avatar,
      },
      miniApp: {
        id: result.miniApp.id,
        name: result.miniApp.name,
        slug: result.miniApp.slug,
      },
      role: result.membership.role,
    });
    response.cookies.set(sessionCookie(sessionToken));
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid Telegram authentication" },
      { status: 401 },
    );
  }
}
