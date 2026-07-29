import Link from "next/link";
import { requireTenantAdminPage } from "@/features/tenant-admin/auth";
import { prisma } from "@/lib/prisma";
import { AdsGalaxyIdForm } from "@/components/tenant-admin/ads-galaxy-id-form";
import { tenantMiniAppUrl } from "@/features/tenant-admin/telegram-start";
export default async function TenantGames({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params,
    a = await requireTenantAdminPage(tenantSlug),
    [memory, quiz, tap, maze, rewards] = await Promise.all([
      prisma.memoryMatchAttempt.count({
        where: { miniAppId: a.miniAppId, status: "COMPLETED" },
      }),
      prisma.quizSession.count({
        where: { miniAppId: a.miniAppId, status: "COMPLETED" },
      }),
      prisma.tapCollectorSession.count({
        where: { miniAppId: a.miniAppId, status: "COMPLETED" },
      }),
      prisma.mazeRunnerAttempt.count({
        where: { miniAppId: a.miniAppId, status: "COMPLETED" },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          miniAppId: a.miniAppId,
          type: "GAME_REWARD",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
    ]),
    games = [
      ["Memory Match", "memory-match", memory],
      ["Quiz Challenge", "quiz-challenge", quiz],
      ["Catch Rush", "tap-collector", tap],
      ["Maze Runner", "maze-runner", maze],
    ] as const;
  return (
    <>
      <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">
        Games
      </p>
      <h1 className="mt-1 text-3xl font-black">Games</h1>
      <p className="mt-2 text-sm text-warm-500">
        Platform-managed games with rewards funded by this Mini App.
      </p>
      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {games.map(([title, slug, plays]) => (
          <article key={slug} className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-[10px] font-black uppercase text-teal-600">
              Available
            </p>
            <h2 className="mt-2 text-xl font-black">{title}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-warm-50 p-3">
                <dt className="text-warm-400">Completed</dt>
                <dd className="mt-1 font-black">{plays}</dd>
              </div>
              <div className="rounded-2xl bg-warm-50 p-3">
                <dt className="text-warm-400">Total rewards</dt>
                <dd className="mt-1 font-black">
                  ${Number(rewards._sum.amount ?? 0).toFixed(2)}
                </dd>
              </div>
            </dl>
            <Link
              href={`/${tenantSlug}/admin/games/${slug}`}
              className="game-primary mt-5"
            >
              Manage Rewards
            </Link>
          </article>
        ))}
      </section>
      <AdsGalaxyIdForm
        tenantSlug={tenantSlug}
        miniAppUrl={tenantMiniAppUrl(tenantSlug)}
      />
    </>
  );
}
