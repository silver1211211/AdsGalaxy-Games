import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/lib/page-auth";
import { getPreviewSession } from "@/lib/development-preview/context";
import { getSession } from "@/lib/session";

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    const preview = await getPreviewSession((await headers()).get("host"));
    if (preview) return children;
    redirect("/");
  }
  await requireAuthenticatedPage({ enforceTenantAvailability: true });
  return children;
}
