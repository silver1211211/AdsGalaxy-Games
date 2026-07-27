import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTelegramInitData } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json() as { initData?: string };
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!initData || !token) return NextResponse.json({ error: "Authentication unavailable" }, { status: 503 });
    const telegram = validateTelegramInitData(initData, token);
    const sql = db();
    const referralCode = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const user = await sql.begin(async (transaction) => {
      const [record] = await transaction`
        INSERT INTO users (
          id, telegram_id, username, first_name, last_name, language, avatar,
          referral_code, status, created_at, updated_at
        ) VALUES (
          ${crypto.randomUUID()}, ${telegram.id}, ${telegram.username ?? null},
          ${telegram.first_name}, ${telegram.last_name ?? null}, ${telegram.language_code ?? null},
          ${telegram.photo_url ?? null}, ${referralCode}, 'ACTIVE', NOW(), NOW()
        )
        ON CONFLICT (telegram_id) DO UPDATE SET
          username = EXCLUDED.username, first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name, language = EXCLUDED.language,
          avatar = EXCLUDED.avatar, updated_at = NOW()
        RETURNING id, telegram_id, username, first_name, last_name, language, avatar,
          total_points, total_rewards, total_games, wallet_balance, status
      `;
      await transaction`
        INSERT INTO wallets (id, user_id, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${record.id}, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `;
      return record;
    });
    return NextResponse.json({ user: { ...user, telegram_id: String(user.telegram_id) } });
  } catch {
    return NextResponse.json({ error: "Invalid Telegram authentication" }, { status: 401 });
  }
}
