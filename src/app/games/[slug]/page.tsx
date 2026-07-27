import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/system/coming-soon";
import { MemoryMatchGame } from "@/features/memory-match/memory-match-game";

const names: Record<string, string> = {
  "memory-match": "Memory Match",
  "quiz-challenge": "Quiz Challenge",
  "tap-collector": "Tap Collector"
};

export default async function GamePlaceholder({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!names[slug]) notFound();
  if (slug === "memory-match") return <MemoryMatchGame />;
  return <ComingSoon title={names[slug]} description="The game room is ready. Gameplay will arrive in a future release." />;
}
