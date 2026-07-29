import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { validateQuestion } from "@/features/quiz/engine";

const inputSchema = z.object({
  questionText: z.string(),
  explanation: z.string(),
  categoryId: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  status: z.enum(["DRAFT", "PUBLISHED", "DISABLED"]),
  options: z
    .array(z.object({ text: z.string(), correct: z.boolean() }))
    .length(4),
});
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    const query = new URL(request.url).searchParams;
    const questions = await prisma.quizQuestion.findMany({
      where: {
        deletedAt: null,
        OR: [
          { sourceType: "GLOBAL_DEFAULT" },
          { ownerMiniAppId: auth.miniAppId },
        ],
        categoryId: query.get("category") || undefined,
        difficulty:
          (query.get("difficulty") as "EASY" | "MEDIUM" | "HARD" | null) ??
          undefined,
        status:
          (query.get("status") as
            | "DRAFT"
            | "PUBLISHED"
            | "DISABLED"
            | "ARCHIVED"
            | null) ?? undefined,
        questionText: query.get("search")
          ? { contains: query.get("search")!, mode: "insensitive" }
          : undefined,
      },
      include: { category: true, options: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      questions,
      categories: await prisma.quizCategory.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
      }),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not load questions" },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    const raw = inputSchema.parse(await request.json());
    const input = validateQuestion(raw);
    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.quizQuestion.create({
        data: {
          ownerMiniAppId: auth.miniAppId,
          createdByUserId: auth.userId,
          sourceType: "MINI_APP_CUSTOM",
          categoryId: raw.categoryId,
          difficulty: raw.difficulty,
          questionText: input.questionText,
          explanation: input.explanation,
          status: raw.status,
          reviewStatus: raw.status === "PUBLISHED" ? "APPROVED" : "PENDING",
          isActive: raw.status === "PUBLISHED",
        },
      });
      await tx.quizQuestionOption.createMany({
        data: input.options.map((option, sortOrder) => ({
          questionId: created.id,
          optionText: option.text,
          isCorrect: option.correct,
          sortOrder,
        })),
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "QUIZ_QUESTION_CREATED",
          targetType: "QuizQuestion",
          targetId: created.id,
        },
      });
      return created;
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create question",
      },
      { status: 422 },
    );
  }
}
