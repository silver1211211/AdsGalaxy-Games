import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect(process.env.NODE_ENV === "development" ? "/dev/access?next=/profile" : "/");
  }
  return children;
}
