import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/features/wallet/encryption";
import {
  startKeyboard,
  telegramWebhookSecret,
} from "@/features/tenant-admin/telegram-start";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await params,
      config = await prisma.tenantBotConfiguration.findFirst({
        where: { miniApp: { slug: tenantSlug, status: "ACTIVE" } },
        include: { miniApp: { include: { adminSettings: true } } },
      });
    if (!config) return new Response(null, { status: 404 });
    const supplied =
        request.headers.get("x-telegram-bot-api-secret-token") ?? "",
      expected = telegramWebhookSecret(config.miniAppId);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
      return new Response(null, { status: 403 });
    const update = (await request.json()) as {
        message?: { text?: string; chat?: { id?: number } };
      },
      chatId = update.message?.chat?.id;
    if (
      !chatId ||
      !/^\/start(?:@\w+)?(?:\s|$)/.test(update.message?.text ?? "")
    )
      return Response.json({ ok: true });
    const s = config.miniApp.adminSettings,
      text = s?.maintenanceMode
        ? s.maintenanceMessage ||
          "This Mini App is temporarily unavailable. Please try again later."
        : s?.startMessage ||
          s?.description ||
          "Welcome! Open the Mini App to get started.",
      reply_markup = startKeyboard(
        tenantSlug,
        s?.miniAppButtonText || "Open Mini App",
        (Array.isArray(s?.inlineButtons) ? s.inlineButtons : []) as any,
      ),
      token = decryptSecret(config.tokenEncrypted);
    let response: Response;
    if (s?.startImageData && s.startImageMime) {
      const form = new FormData();
      form.set("chat_id", String(chatId));
      form.set(
        "photo",
        new Blob([s.startImageData], { type: s.startImageMime }),
        "start-image",
      );
      form.set("caption", text);
      form.set("reply_markup", JSON.stringify(reply_markup));
      response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        body: form,
      });
    } else
      response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, reply_markup }),
        },
      );
    if (!response.ok)
      console.error("Telegram start delivery failed", {
        tenantSlug,
        status: response.status,
      });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "Telegram webhook processing failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ ok: true });
  }
}
