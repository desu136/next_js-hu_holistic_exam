import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";

function extractManualEarned(breakdown: unknown) {
  if (!Array.isArray(breakdown)) return new Map<string, number>();
  const map = new Map<string, number>();
  for (const item of breakdown) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    if (typeof i.questionId !== "string") continue;
    if (typeof i.earned !== "number") continue;
    if (i.manual === true) map.set(i.questionId, i.earned);
  }
  return map;
}

export async function regenerateResultsForExam(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      totalMarks: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, type: true, marks: true, correct: true },
      },
    },
  });

  if (!exam) {
    return { ok: false as const, error: "EXAM_NOT_FOUND" as const, attempts: 0, resultsUpserted: 0 };
  }

  const attempts = await prisma.attempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      id: true,
      answers: { select: { questionId: true, value: true } },
    },
  });

  let upserted = 0;

  for (const a of attempts) {
    const existing = await prisma.result.findUnique({
      where: { attemptId: a.id },
      select: { breakdown: true },
    });
    const manual = extractManualEarned(existing?.breakdown);

    const graded = gradeAttempt(exam.questions, a.answers);
    if (manual.size > 0) {
      let score = 0;
      const breakdown = graded.breakdown.map((b) => {
        const earned = manual.has(b.questionId) ? (manual.get(b.questionId) ?? 0) : b.earned;
        const next = manual.has(b.questionId)
          ? { ...b, earned, manual: true }
          : b;
        score += earned;
        return next;
      });

      graded.score = score;
      graded.breakdown = breakdown;
    }

    if (typeof exam.totalMarks === "number" && exam.totalMarks > 0 && graded.maxScore > 0) {
      const factor = exam.totalMarks / graded.maxScore;
      graded.score = Math.round(graded.score * factor);
      graded.maxScore = exam.totalMarks;
    }

    await prisma.result.upsert({
      where: { attemptId: a.id },
      update: {
        score: graded.score,
        maxScore: graded.maxScore,
        breakdown: graded.breakdown,
      },
      create: {
        attemptId: a.id,
        score: graded.score,
        maxScore: graded.maxScore,
        breakdown: graded.breakdown,
      },
    });

    upserted += 1;
  }

  return { ok: true as const, attempts: attempts.length, resultsUpserted: upserted };
}
