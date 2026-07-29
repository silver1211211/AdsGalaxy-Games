import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";

export default async function AdminEntryPage() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect(process.env.NODE_ENV === "development" ? "/dev/access?next=/admin" : "/games");
  }
  redirect(`/${session.miniApp.slug}/admin`);
}
