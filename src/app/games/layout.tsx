import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPreviewSession } from "@/lib/development-preview/context";

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    const preview = await getPreviewSession((await headers()).get("host"));
    if (!preview) redirect("/");
  }
  return children;
}
