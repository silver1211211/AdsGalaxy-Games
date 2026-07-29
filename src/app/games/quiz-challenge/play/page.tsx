import { Suspense } from "react";
import { headers } from "next/headers";
import { QuizPlay } from "@/components/quiz/quiz-play";
import { PreviewQuizGame } from "@/components/development/preview-quiz-game";
import { getPreviewSession } from "@/lib/development-preview/context";
export default async function QuizPlayPage(){const preview=await getPreviewSession((await headers()).get("host"));return preview?<PreviewQuizGame play/>:<Suspense fallback={<main className="grid min-h-dvh place-items-center">Loading Quiz…</main>}><QuizPlay/></Suspense>}
