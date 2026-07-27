import { AdSlot } from "@/components/ads/ad-slot";
import { GameCard } from "@/components/home/game-card";
import { GreetingCard } from "@/components/home/greeting-card";
import { MotivationCard } from "@/components/home/motivation-card";
import { StatsGrid } from "@/components/home/stats-grid";
import { AppShell } from "@/components/layout/app-shell";

const games = [
  { slug: "memory-match", title: "Memory Match", description: "Train your memory by matching identical cards.", time: "2–4 min", reward: "Up to 80", difficulty: "Easy", kind: "memory" as const },
  { slug: "quiz-challenge", title: "Quiz Challenge", description: "Answer questions and earn rewards.", time: "3–5 min", reward: "Up to 120", difficulty: "Medium", kind: "quiz" as const },
  { slug: "tap-collector", title: "Tap Collector", description: "Collect items before time runs out.", time: "1–2 min", reward: "Up to 60", difficulty: "Easy", kind: "tap" as const }
];

export default function GamesPage() {
  return (
    <AppShell>
      <main>
        <GreetingCard />
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Pick & play</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Featured games</h2></div>
            <span className="hidden text-xs font-bold text-warm-400 sm:block">New games coming soon</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{games.map((game) => <GameCard key={game.slug} {...game} />)}</div>
        </section>
        <section className="mt-10"><div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Your progress</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">At a glance</h2></div><StatsGrid /></section>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_1fr]"><MotivationCard /><AdSlot /></div>
      </main>
    </AppShell>
  );
}
