# Ads Galaxy Mini App

Production-oriented foundation for a Telegram Mini App built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Local setup

1. Copy `.env.example` to `.env` and configure PostgreSQL and the Telegram bot token.
2. Run `npm install`.
3. Run `npm run prisma:generate` and `npm run prisma:migrate`.
4. Run `npm run dev`.

Telegram Web App init data is validated server-side using Telegram's HMAC signature scheme. The browser provider uses a friendly demo identity outside Telegram so the homepage remains previewable.

## Boundaries

This release contains navigation, homepage presentation, authentication and database foundations only. Game, wallet, task, profile, withdrawal, advertising, and reward business logic are intentionally not implemented.
