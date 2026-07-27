import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitData } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json() as { initData?: string };
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!initData || !token) return NextResponse.json({ error: "Authentication unavailable" }, { status: 503 });
    const telegram = validateTelegramInitData(initData, token);
    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { telegramId: BigInt(telegram.id) } });
      if (existing) return tx.user.update({
        where: { id: existing.id },
        data: { username: telegram.username, firstName: telegram.first_name, lastName: telegram.last_name,
          language: telegram.language_code, avatar: telegram.photo_url }
      });
      const created = await tx.user.create({
        data: { telegramId: BigInt(telegram.id), username: telegram.username, firstName: telegram.first_name,
          lastName: telegram.last_name, language: telegram.language_code, avatar: telegram.photo_url,
          referralCode: crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase() }
      });
      await tx.wallet.create({ data: { userId: created.id } });
      return created;
    });
    return NextResponse.json({ user: { ...user, telegramId: user.telegramId.toString() } });
  } catch {
    return NextResponse.json({ error: "Invalid Telegram authentication" }, { status: 401 });
  }
}
