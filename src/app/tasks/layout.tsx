import { requireAuthenticatedPage } from "@/lib/page-auth";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedPage({ enforceTenantAvailability: true });
  return children;
}
