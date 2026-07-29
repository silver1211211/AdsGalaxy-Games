import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/system/coming-soon";
import { MemoryMatchGame } from "@/features/memory-match/memory-match-game";
import { headers } from "next/headers";
import { getPreviewSession } from "@/lib/development-preview/context";
import { PreviewMemoryGame } from "@/components/development/preview-memory-game";
import { PreviewQuizGame } from "@/components/development/preview-quiz-game";
import { PreviewTapGame } from "@/components/development/preview-tap-game";

const names: Record<string, string> = {
  "memory-match": "Memory Match",
  "quiz-challenge": "Quiz Challenge",
  "tap-collector": "Catch Rush"
};

export default async function GamePlaceholder({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!names[slug]) notFound();
  const preview = await getPreviewSession((await headers()).get("host"));
  if (preview) {
    if (slug === "memory-match") return <PreviewMemoryGame />;
    if (slug === "quiz-challenge") return <PreviewQuizGame />;
    return <PreviewTapGame />;
  }
  if (slug === "memory-match") return <MemoryMatchGame />;
  return <ComingSoon title={names[slug]} description="The game room is ready. Gameplay will arrive in a future release." />;
}
