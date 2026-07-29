import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { QuizQuestionManager } from "@/components/admin/quiz-question-manager";
export default async function QuizQuestionsPage(){try{await requireAdmin();}catch{redirect("/games");}return <main className="mx-auto min-h-dvh w-full max-w-[980px] px-4 py-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-600">Administration</p><h1 className="mt-1 text-3xl font-extrabold">Quiz questions</h1><p className="mb-6 mt-2 text-sm text-warm-600">Browse defaults and create tenant-owned questions. Defaults remain read-only.</p><QuizQuestionManager/></main>}
