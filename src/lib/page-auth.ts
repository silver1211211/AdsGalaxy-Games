import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { developmentAuthAllowed } from "./development-auth";
import { getSession } from "./session";
import { prisma } from "./prisma";

type PageSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export function pageAuthorizationDecision(
  session: PageSession | null,
  options: { roles?: Array<PageSession["role"]>; developmentHostAllowed?: boolean } = {},
) {
  if (!session) return "HOME" as const;
  if (session.source === "DEVELOPMENT" && !options.developmentHostAllowed)
    return "HOME" as const;
  if (options.roles && !options.roles.includes(session.role))
    return "HOME" as const;
  return "ALLOW" as const;
}

export async function requireAuthenticatedPage(options?: {
  roles?: Array<PageSession["role"]>;
  enforceTenantAvailability?: boolean;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const host = (await headers()).get("host");
  if (
    pageAuthorizationDecision(session, {
      roles: options?.roles,
      developmentHostAllowed: developmentAuthAllowed(host),
    }) !== "ALLOW"
  )
    redirect("/");

  if (options?.enforceTenantAvailability && session.miniApp.status !== "ACTIVE")
    redirect("/");

  if (options?.enforceTenantAvailability && session.role === "USER") {
    const [platform, tenant] = await Promise.all([
      prisma.platformConfiguration.findUnique({
        where: { id: "platform" },
        select: { maintenanceMode: true },
      }),
      prisma.tenantAdminSettings.findUnique({
        where: { miniAppId: session.miniAppId },
        select: { maintenanceMode: true },
      }),
    ]);
    if (platform?.maintenanceMode || tenant?.maintenanceMode) redirect("/");
  }
  return session;
}

export function requireWalletPage() {
  return requireAuthenticatedPage({ enforceTenantAvailability: true });
}

export function requireAdminPageIdentity() {
  return requireAuthenticatedPage({
    roles: ["ADMIN", "SUPER_ADMIN"],
    enforceTenantAvailability: true,
  });
}

export function requireSuperAdminPageIdentity() {
  return requireSuperAdminBrowserPageIdentity();
}

export function superAdminPageAuthorizationDecision(
  session: PageSession | null,
  developmentHostAllowed = false,
) {
  if (!session) return "LOGIN" as const;
  if (session.source === "DEVELOPMENT" && !developmentHostAllowed)
    return "HOME" as const;
  if (session.role !== "SUPER_ADMIN") return "HOME" as const;
  return "ALLOW" as const;
}

export async function requireSuperAdminBrowserPageIdentity() {
  const session = await getSession();
  const host = (await headers()).get("host");
  const decision = superAdminPageAuthorizationDecision(
    session,
    developmentAuthAllowed(host),
  );
  if (decision === "LOGIN") redirect("/super-admin-login");
  if (decision === "HOME") redirect("/");
  if (!session) redirect("/super-admin-login");
  return session;
}
