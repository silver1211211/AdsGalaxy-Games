import { notFound } from "next/navigation";
import { GameRewardsForm } from "@/components/tenant-admin/game-rewards-form";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";

const names: Record<string, string> = {
  "memory-match": "Memory Match", "quiz-challenge": "Quiz Challenge",
  "tap-collector": "Catch Rush", "maze-runner": "Maze Runner",
};
export default async function Page({ params }: { params: Promise<{ tenantSlug: string; gameKey: string }> }) {
  const { tenantSlug, gameKey } = await params;
  await requireTenantAdminPage(tenantSlug);
  if (!names[gameKey]) notFound();
  return <><p className="text-xs font-black uppercase tracking-wider text-teal-600">Games</p><h1 className="mt-1 text-3xl font-black">{names[gameKey]} rewards</h1><p className="mb-6 mt-2 text-sm text-warm-500">Configure only the rewards funded by this Mini App. Gameplay, ads, probabilities, and safety rules are platform controlled.</p><GameRewardsForm tenantSlug={tenantSlug} gameKey={gameKey} /></>;
}
