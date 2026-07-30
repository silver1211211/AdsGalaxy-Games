import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdmin } from "@/features/tenant-admin/auth";
import { encryptSecret } from "@/features/wallet/encryption";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/features/profile/security";
import { maskBotToken } from "@/features/tenant-admin/secrets";
import { telegramWebhookSecret } from "@/features/tenant-admin/telegram-start";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
import { safeApiError, zodApiError } from "@/lib/safe-api-error";

const schema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(/^\d{6,15}:[A-Za-z0-9_-]{20,}$/),
  })
  .strict();
export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const auth = await requireTenantAdmin((await params).tenantSlug);
    const config = await prisma.tenantBotConfiguration.findUnique({
      where: { miniAppId: auth.miniAppId },
    });
    const configuredBy = config
      ? await prisma.user.findUnique({
          where: { id: config.configuredByUserId },
          select: { firstName: true, lastName: true, username: true },
        })
      : null;
    return NextResponse.json(
      config
        ? {
            configured: true,
            tokenMasked: config.tokenMasked,
            botId: config.botId,
            botUsername: config.botUsername,
            validationStatus: config.validationStatus,
            configuredAt: config.configuredAt,
            configuredBy:
              configuredBy?.username ??
              ([configuredBy?.firstName, configuredBy?.lastName]
                .filter(Boolean)
                .join(" ") ||
                "Admin"),
          }
        : { configured: false },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load bot configuration" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    assertSameOrigin(request);
    const auth = await requireTenantAdmin((await params).tenantSlug);
    await requireRecentAdminElevation({ userId: auth.userId, scopeType: "TENANT_ADMIN", miniAppId: auth.miniAppId });
    const existing = await prisma.tenantBotConfiguration.findUnique({
      where: { miniAppId: auth.miniAppId },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json(
        {
          error:
            "This bot token is already configured. Contact the platform owner to replace it.",
          code: "TOKEN_ALREADY_CONFIGURED",
        },
        { status: 409 },
      );
    const { token } = schema.parse(await request.json());
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      result?: { id: number; username?: string };
    };
    if (!response.ok || !result.ok || !result.result)
      return NextResponse.json(
        { error: "Telegram rejected this bot token" },
        { status: 422 },
      );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (appUrl) {
      const hook = await fetch(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: `${appUrl}/api/telegram/${auth.miniApp.slug}/webhook`,
              secret_token: telegramWebhookSecret(auth.miniAppId),
              allowed_updates: ["message"],
              drop_pending_updates: false,
            }),
            signal: AbortSignal.timeout(8000),
          },
        ),
        body = (await hook.json()) as { ok?: boolean; description?: string };
      if (!hook.ok || !body.ok)
        return NextResponse.json(
          {
            error:
              "The bot is valid, but its secure webhook could not be configured.",
            code: "INVALID_BOT_TOKEN",
          },
          { status: 422 },
        );
    }
    const saved = await prisma.$transaction(async (tx) => {
      const config = await tx.tenantBotConfiguration.create({
        data: {
          miniAppId: auth.miniAppId,
          tokenEncrypted: encryptSecret(token),
          tokenMasked: maskBotToken(token),
          botId: String(result.result!.id),
          botUsername: result.result!.username,
          configuredByUserId: auth.userId,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "TELEGRAM_BOT_CONFIGURED",
          targetType: "TenantBotConfiguration",
          targetId: config.id,
          after: {
            tokenMasked: config.tokenMasked,
            botId: config.botId,
            botUsername: config.botUsername,
          },
        },
      });
      return config;
    });
    return NextResponse.json({
      configured: true,
      tokenMasked: saved.tokenMasked,
      botId: saved.botId,
      botUsername: saved.botUsername,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError)
      return NextResponse.json(
        zodApiError(error, "Enter a valid Telegram bot token."),
        { status: 422 },
      );
    return NextResponse.json(
      safeApiError(
        "The bot could not be configured. Try again.",
        "BOT_CONFIGURATION_FAILED",
      ),
      { status: 500 },
    );
  }
}
