import { PrismaClient } from "@prisma/client";
import { buildSeedQuestions, STARTER_CATEGORIES } from "../src/features/quiz/seed-data";

const prisma = new PrismaClient();

async function main() {
  const categories = new Map<string, string>();
  for (const [slug, name, icon] of STARTER_CATEGORIES) {
    const existing = await prisma.quizCategory.findFirst({ where: { ownerMiniAppId: null, slug } });
    const category = existing
      ? await prisma.quizCategory.update({ where: { id: existing.id }, data: { name, icon, description: `${name} questions for a broad international audience.`, enabled: true } })
      : await prisma.quizCategory.create({ data: { slug, name, icon, description: `${name} questions for a broad international audience.`, sortOrder: categories.size } });
    categories.set(slug, category.id);
  }
  for (const question of buildSeedQuestions()) {
    const record = await prisma.quizQuestion.upsert({
      where: { seedKey: question.seedKey },
      create: {
        seedKey: question.seedKey, sourceType: "GLOBAL_DEFAULT", categoryId: categories.get(question.categorySlug)!,
        difficulty: question.difficulty, questionText: question.questionText, explanation: question.explanation,
        status: "PUBLISHED", reviewStatus: "APPROVED", isActive: true
      },
      update: {
        categoryId: categories.get(question.categorySlug)!, difficulty: question.difficulty,
        questionText: question.questionText, explanation: question.explanation,
        status: "PUBLISHED", reviewStatus: "APPROVED", isActive: true
      }
    });
    await prisma.quizQuestionOption.deleteMany({ where: { questionId: record.id } });
    await prisma.quizQuestionOption.createMany({
      data: question.options.map((optionText, sortOrder) => ({ questionId: record.id, optionText, sortOrder, isCorrect: sortOrder === 0 }))
    });
  }
  console.log(`Seeded ${STARTER_CATEGORIES.length} Quiz categories and ${buildSeedQuestions().length} questions.`);
}

main().finally(() => prisma.$disconnect());
