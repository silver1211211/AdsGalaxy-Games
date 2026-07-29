import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { validateQuestion } from "@/features/quiz/engine";
const schema = z.object({
  questionText: z.string(),
  explanation: z.string(),
  categoryId: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  status: z.enum(["DRAFT", "PUBLISHED", "DISABLED"]),
  options: z
    .array(z.object({ text: z.string(), correct: z.boolean() }))
    .length(4),
});
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const auth = await requireAdmin();
    const { questionId } = await params;
    const raw = schema.parse(await request.json());
    const input = validateQuestion(raw);
    const existing = await prisma.quizQuestion.findFirst({
      where: {
        id: questionId,
        ownerMiniAppId: auth.miniAppId,
        sourceType: "MINI_APP_CUSTOM",
        deletedAt: null,
      },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Custom question not found" },
        { status: 404 },
      );
    await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.update({
        where: { id: existing.id },
        data: {
          categoryId: raw.categoryId,
          difficulty: raw.difficulty,
          questionText: input.questionText,
          explanation: input.explanation,
          status: raw.status,
          isActive: raw.status === "PUBLISHED",
        },
      });
      await tx.quizQuestionOption.deleteMany({
        where: { questionId: existing.id },
      });
      await tx.quizQuestionOption.createMany({
        data: input.options.map((option, sortOrder) => ({
          questionId: existing.id,
          optionText: option.text,
          isCorrect: option.correct,
          sortOrder,
        })),
      });
      await tx.adminAuditLog.create({
        data: {
          miniAppId: auth.miniAppId,
          actorUserId: auth.userId,
          action: "QUIZ_QUESTION_UPDATED",
          targetType: "QuizQuestion",
          targetId: existing.id,
        },
      });
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not update question" },
      { status: 422 },
    );
  }
}
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const auth = await requireAdmin();
    const { questionId } = await params;
    const result = await prisma.quizQuestion.updateMany({
      where: {
        id: questionId,
        ownerMiniAppId: auth.miniAppId,
        sourceType: "MINI_APP_CUSTOM",
      },
      data: { deletedAt: new Date(), status: "ARCHIVED", isActive: false },
    });
    if (!result.count)
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    await prisma.adminAuditLog.create({
      data: {
        miniAppId: auth.miniAppId,
        actorUserId: auth.userId,
        action: "QUIZ_QUESTION_ARCHIVED",
        targetType: "QuizQuestion",
        targetId: questionId,
      },
    });
    return NextResponse.json({ archived: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Could not archive question" },
      { status: 400 },
    );
  }
}
