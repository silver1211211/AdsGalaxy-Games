# Ads Galaxy Mini App

Production-oriented foundation for a Telegram Mini App built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Local setup

1. Copy `.env.example` to `.env` and configure PostgreSQL and the Telegram bot token.
2. Run `npm install`.
3. Run `npm run prisma:generate` and `npm run prisma:migrate`.
4. Run `npm run dev`.

Telegram Web App init data is validated server-side using Telegram's HMAC signature scheme.

## Signed local development access

1. Start PostgreSQL and configure `DATABASE_URL` in `.env.local`.
2. Set `APP_SESSION_SECRET` to at least 32 random characters.
3. Add `ALLOW_DEVELOPMENT_AUTH=true` to `.env.local`.
4. Run `npm run dev`.
5. Open `http://localhost:3000/dev/access`.
6. Choose User, Admin, or Super Admin and continue to `/games`.

The route creates the same signed, expiring, HttpOnly application session used by Telegram authentication. It bootstraps one reserved local user, Mini App, membership, zero-balance wallet, default game settings, and a disabled shared Ads Galaxy configuration. Repeated login is idempotent.

The development route returns 404 unless the application is running with `NODE_ENV=development`, development authentication is explicitly enabled, and the request host is loopback. Never enable this option in production. Local ad testing does not imitate authenticated Ads Galaxy production verification or credit withdrawable rewards.

## Boundaries

Production and preview deployments continue to require Telegram authentication for protected gameplay.
