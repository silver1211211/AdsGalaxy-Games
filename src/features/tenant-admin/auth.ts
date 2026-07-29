import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/lib/page-auth";
import { isValidTenantSlug, tenantAccessAllowed } from "./boundary";
export { isValidTenantSlug, tenantAccessAllowed } from "./boundary";

export async function requireTenantAdminIdentity(tenantSlug: string) {
  if (!isValidTenantSlug(tenantSlug))
    throw new Response("Tenant not found", { status: 404 });
  const session = await requireSession();
  const membership = await prisma.miniAppMembership.findFirst({
    where: {
      id: session.membershipId,
      userId: session.userId,
      miniAppId: session.miniAppId,
      status: "ACTIVE",
      miniApp: { slug: tenantSlug, status: "ACTIVE" },
      user: { status: "ACTIVE" },
    },
    include: { miniApp: true, user: true },
  });
  if (
    !membership ||
    !tenantAccessAllowed({
      sessionMiniAppId: session.miniAppId,
      sessionMembershipId: session.membershipId,
      membership,
    })
  )
    throw new Response("Forbidden", { status: 403 });
  return {
    ...session,
    miniAppId: membership.miniAppId,
    membership,
    miniApp: membership.miniApp,
  };
}

export async function requireTenantAdmin(
  tenantSlug: string,
  options?: { allowPasswordChange?: boolean },
) {
  const session = await requireTenantAdminIdentity(tenantSlug);
  const { getAdminElevation } =
    await import("@/features/admin-security/elevation");
  const elevation = await getAdminElevation({
    userId: session.userId,
    scopeType: "TENANT_ADMIN",
    miniAppId: session.miniAppId,
    allowPasswordChange: options?.allowPasswordChange,
  });
  if (!elevation.ok) {
    throw Response.json(
      {
        error: "Administrator password verification is required.",
        code: elevation.code,
      },
      { status: 403 },
    );
  }
  return { ...session, adminElevation: elevation };
}

export async function requireTenantAdminPage(tenantSlug: string) {
  const session = await requireTenantAdminPageIdentity(tenantSlug);
  const { getAdminElevation } =
    await import("@/features/admin-security/elevation");
  const elevation = await getAdminElevation({
    userId: session.userId,
    scopeType: "TENANT_ADMIN",
    miniAppId: session.miniAppId,
    allowPasswordChange: true,
  });
  if (!elevation.ok) redirect(`/${tenantSlug}/administrator-verification`);
  if (elevation.mustChangePassword)
    redirect(`/${tenantSlug}/administrator-security`);
  return { ...session, adminElevation: elevation };
}

export async function requireTenantAdminPageIdentity(tenantSlug: string) {
  if (!isValidTenantSlug(tenantSlug)) redirect("/");
  const session = await requireAuthenticatedPage({
    roles: ["ADMIN", "SUPER_ADMIN"],
    enforceTenantAvailability: true,
  });
  const membership = await prisma.miniAppMembership.findFirst({
    where: {
      id: session.membershipId,
      userId: session.userId,
      miniAppId: session.miniAppId,
      status: "ACTIVE",
      miniApp: { slug: tenantSlug, status: "ACTIVE" },
      user: { status: "ACTIVE" },
    },
    include: { miniApp: true, user: true },
  });
  if (
    !membership ||
    !tenantAccessAllowed({
      sessionMiniAppId: session.miniAppId,
      sessionMembershipId: session.membershipId,
      membership,
    })
  )
    redirect("/");
  return { ...session, membership, miniApp: membership.miniApp };
}
