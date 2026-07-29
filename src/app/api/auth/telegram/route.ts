import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitData } from "@/lib/telegram-auth";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
  sessionIdentifierHash,
} from "@/lib/session";
import { deviceLabel } from "@/features/profile/profile";

const inputSchema = z.object({
  initData: z.string().min(1),
  miniAppSlug: z
    .string()
    .regex(/^[a-z0-9-]{3,64}$/)
    .optional(),
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
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token)
      return NextResponse.json(
        { error: "Authentication unavailable" },
        { status: 503 },
      );
    const telegram = validateTelegramInitData(input.initData, token);
    const slug =
      input.miniAppSlug ?? process.env.DEFAULT_MINI_APP_SLUG ?? "ads-galaxy";
    const role = superAdminIds().has(String(telegram.id))
      ? ("SUPER_ADMIN" as const)
      : ("USER" as const);
    const result = await prisma.$transaction(async (tx) => {
      const miniApp = await tx.miniApp.upsert({
        where: { slug },
        create: {
          slug,
          name: process.env.DEFAULT_MINI_APP_NAME ?? "Ads Galaxy",
        },
        update: {},
      });
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
      const membership = await tx.miniAppMembership.upsert({
        where: { miniAppId_userId: { miniAppId: miniApp.id, userId: user.id } },
        create: { miniAppId: miniApp.id, userId: user.id, role },
        update: role === "SUPER_ADMIN" ? { role } : {},
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
  } catch (error) {
    console.error("Telegram authentication failed", error);
    return NextResponse.json(
      { error: "Invalid Telegram authentication" },
      { status: 401 },
    );
  }
}
