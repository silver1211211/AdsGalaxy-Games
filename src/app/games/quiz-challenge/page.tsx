import { headers } from "next/headers";
import { QuizLobby } from "@/components/quiz/quiz-lobby";
import { PreviewQuizGame } from "@/components/development/preview-quiz-game";
import { getPreviewSession } from "@/lib/development-preview/context";
export default async function QuizChallengePage(){const preview=await getPreviewSession((await headers()).get("host"));return preview?<PreviewQuizGame/>:<QuizLobby/>}
