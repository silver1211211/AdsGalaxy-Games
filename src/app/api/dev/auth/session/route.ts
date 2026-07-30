import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
  sessionIdentifierHash,
} from "@/lib/session";
import { deviceLabel } from "@/features/profile/profile";
import {
  classifyDevelopmentDatabaseError,
  developmentAdminTenantSlug,
  developmentAuthAllowed,
  developmentIdentity,
  developmentPublicTenantSlug,
  developmentTenantSlug,
  developmentSuperAdminIdentity,
  developmentRole,
  safeDevelopmentRedirect,
} from "@/lib/development-auth";

const schema = z
  .object({
    role: z.string(),
    next: z.string().optional(),
    tenantSlug: z.string().optional(),
  })
  .strict();
export async function POST(request: Request) {
  if (!developmentAuthAllowed(request.headers.get("host")))
    return new NextResponse(null, { status: 404 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      {
        error:
          "DATABASE_URL is not configured. Add it to .env.local, start PostgreSQL, apply the migrations, and retry.",
        code: "DATABASE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  if (
    !process.env.APP_SESSION_SECRET ||
    process.env.APP_SESSION_SECRET.length < 32
  )
    return NextResponse.json(
      {
        error:
          "APP_SESSION_SECRET must be configured with at least 32 characters in .env.local.",
        code: "SESSION_SECRET_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  try {
    const input = schema.parse(await request.json());
    const role = developmentRole(input.role);
    if (!role)
      return NextResponse.json({ error: "Invalid role" }, { status: 422 });
    if (input.tenantSlug && !developmentTenantSlug(input.tenantSlug))
      return NextResponse.json(
        { error: "Invalid development tenant.", code: "INVALID_TENANT" },
        { status: 422 },
      );
    if (
      role === "SUPER_ADMIN" &&
      process.env.ALLOW_DEVELOPMENT_SUPER_ADMIN_ACCESS !== "true"
    )
      return NextResponse.json(
        { error: "Local Super Admin access is disabled.", code: "FORBIDDEN" },
        { status: 403 },
      );
    const identity =
      role === "SUPER_ADMIN"
        ? developmentSuperAdminIdentity()
        : developmentIdentity();
    await prisma.$queryRaw`SELECT 1`;
    const requestedTenantSlug =
      role === "ADMIN"
        ? developmentAdminTenantSlug(input.next)
        : role === "USER"
          ? developmentTenantSlug(input.tenantSlug) ??
            developmentPublicTenantSlug(input.next)
          : null;
    const result = await prisma.$transaction(async (tx) => {
      const targetSlug = requestedTenantSlug ?? identity.miniAppSlug;
      const miniApp =
        role === "ADMIN" && requestedTenantSlug
          ? await tx.miniApp.findUnique({ where: { slug: requestedTenantSlug } })
          : await tx.miniApp.upsert({
            where: { slug: targetSlug },
            create: {
              slug: targetSlug,
              name:
                requestedTenantSlug && role === "USER"
                  ? `${requestedTenantSlug
                      .split("-")
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(" ")} Local Development`
                  : identity.miniAppName,
              status: "ACTIVE",
            },
            update: { status: "ACTIVE" },
          });
      if (!miniApp || miniApp.status !== "ACTIVE")
        throw new Error("Requested development tenant is unavailable");
      const user = await tx.user.upsert({
        where: { telegramId: identity.telegramId },
        create: {
          telegramId: identity.telegramId,
          username: identity.username,
          firstName: identity.firstName,
          lastName: identity.lastName,
          referralCode: crypto
            .randomUUID()
            .replaceAll("-", "")
            .slice(0, 12)
            .toUpperCase(),
        },
        update: {
          username: identity.username,
          firstName: identity.firstName,
          lastName: identity.lastName,
          status: "ACTIVE",
        },
      });
      const membership = await tx.miniAppMembership.upsert({
        where: { miniAppId_userId: { miniAppId: miniApp.id, userId: user.id } },
        create: { miniAppId: miniApp.id, userId: user.id, role },
        update: { role, status: "ACTIVE" },
      });
      await Promise.all([
        tx.wallet.upsert({
          where: {
            miniAppId_userId: { miniAppId: miniApp.id, userId: user.id },
          },
          create: { miniAppId: miniApp.id, userId: user.id },
          update: {},
        }),
        tx.memoryMatchSettings.upsert({
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
            environment: "DEVELOPMENT_MOCK",
            status: "INACTIVE",
          },
          update: {},
        }),
        tx.miniAppUserProfile.upsert({
          where: {
            miniAppId_userId: { miniAppId: miniApp.id, userId: user.id },
          },
          create: { miniAppId: miniApp.id, userId: user.id },
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
        source: "LOCAL_DEVELOPMENT",
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        userAgentSummary: request.headers.get("user-agent")?.slice(0, 120),
        deviceLabel: deviceLabel(request.headers.get("user-agent")),
      },
    });
    const token = createSessionToken({
      userId: result.user.id,
      miniAppId: result.miniApp.id,
      membershipId: result.membership.id,
      role: result.membership.role,
      source: "DEVELOPMENT",
      sessionId,
    });
    const response = NextResponse.json({
      redirect: safeDevelopmentRedirect(input.next),
      role: result.membership.role,
    });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    console.error(
      "Local development session bootstrap failed",
      error instanceof Error ? error.message : error,
    );
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid development session request.",
          code: "INVALID_REQUEST",
        },
        { status: 422 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON.", code: "INVALID_JSON" },
        { status: 400 },
      );
    }
    const kind = classifyDevelopmentDatabaseError(error);
    const message =
      kind === "MISSING_TABLES"
        ? "Database tables are missing. Run npx prisma migrate dev and retry."
        : kind === "UNREACHABLE"
          ? "PostgreSQL is unavailable. Start PostgreSQL, verify DATABASE_URL, apply the migrations, and retry."
          : "The development database could not be initialized. Check the server log and database configuration.";
    return NextResponse.json({ error: message, code: kind }, { status: 503 });
  }
}
