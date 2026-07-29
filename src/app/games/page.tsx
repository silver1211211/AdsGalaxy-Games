import { AdSlot } from "@/components/ads/ad-slot";
import { GameCard } from "@/components/home/game-card";
import { GreetingCard } from "@/components/home/greeting-card";
import { MotivationCard } from "@/components/home/motivation-card";
import { StatsGrid } from "@/components/home/stats-grid";
import { AppShell } from "@/components/layout/app-shell";
import { headers } from "next/headers";
import { getPreviewSession } from "@/lib/development-preview/context";
import { DevelopmentPreviewBanner } from "@/components/development/development-preview-banner";
import { SponsoredCard } from "@/components/sponsored/sponsored-card";

const games = [
  { slug: "memory-match", title: "Memory Match", description: "Master 15 balanced levels with special reward-card moments.", time: "2–4 min", difficulty: "Progressive", kind: "memory" as const, available: true },
  { slug: "quiz-challenge", title: "Quiz Challenge", description: "Four timed modes with category, streak and Daily challenges.", time: "2–6 min", difficulty: "Progressive", kind: "quiz" as const, available: true },
  { slug: "tap-collector", title: "Catch Rush", description: "Catch falling collectibles, claim Coins, and avoid Bombs across 10 levels.", time: "1–4 min", difficulty: "Progressive", kind: "tap" as const, available: true },
  { slug: "maze-runner", title: "Maze Runner", description: "Navigate 20 fair mazes with keys, gates, collectibles, and traps.", time: "2–6 min", difficulty: "Progressive", kind: "maze" as const, available: true }
];

export default async function GamesPage() {
  const preview = await getPreviewSession((await headers()).get("host"));
  return (
    <AppShell>
      <main>
        {preview && <DevelopmentPreviewBanner role={preview.role} />}
        <GreetingCard />
        <SponsoredCard />
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Pick & play</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Featured games</h2></div>
            <span className="hidden text-xs font-bold text-warm-400 sm:block">New games coming soon</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{games.map((game) => <GameCard key={game.slug} {...game} />)}</div>
        </section>
        <section className="mt-10"><div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Your progress</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">At a glance</h2></div><StatsGrid /></section>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_1fr]"><MotivationCard /><AdSlot placement="games_home_sponsored" /></div>
      </main>
    </AppShell>
  );
}
