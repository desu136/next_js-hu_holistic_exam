import { QuestionType } from "@prisma/client";

export type GradeInputQuestion = {
  id: string;
  type: QuestionType;
  marks: number;
  correct: unknown;
};

export type GradeInputAnswer = {
  questionId: string;
  value: unknown;
};

export type GradeBreakdownItem = {
  questionId: string;
  marks: number;
  earned: number;
  correct: boolean;
};

function normalizeChoice(value: unknown) {
  if (typeof value === "string") return value.trim().toLowerCase();
  return "";
}

function extractChoice(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return normalizeChoice(value);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.choice === "string") return normalizeChoice(v.choice);
    if (typeof v.value === "string") return normalizeChoice(v.value);
  }
  return "";
}

function extractCorrectChoice(correct: unknown) {
  if (!correct) return "";
  if (typeof correct === "string") return normalizeChoice(correct);
  if (typeof correct === "object") {
    const c = correct as Record<string, unknown>;
    if (typeof c.choice === "string") return normalizeChoice(c.choice);
    if (typeof c.value === "string") return normalizeChoice(c.value);
  }
  return "";
}

export function gradeAttempt(questions: GradeInputQuestion[], answers: GradeInputAnswer[]) {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value] as const));

  const breakdown: GradeBreakdownItem[] = [];
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += q.marks;

    const value = answerMap.get(q.id);

    if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE) {
      const given = extractChoice(value);
      const expected = extractCorrectChoice(q.correct);
      const ok = given.length > 0 && expected.length > 0 && given === expected;

      const earned = ok ? q.marks : 0;
      score += earned;
      breakdown.push({ questionId: q.id, marks: q.marks, earned, correct: ok });
      continue;
    }

    breakdown.push({ questionId: q.id, marks: q.marks, earned: 0, correct: false });
  }

  return { score, maxScore, breakdown };
}
