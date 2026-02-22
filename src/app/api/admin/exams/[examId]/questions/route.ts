import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { regenerateResultsForExam } from "@/lib/results";
import { Prisma } from "@prisma/client";

const QuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

const CreateQuestionSchema = z.object({
  type: QuestionTypeSchema,
  prompt: z.string().min(1),
  marks: z.number().int().min(1).default(1),
  options: z.array(z.string().min(1)).optional(),
  correctChoice: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      academicYear: true,
      durationMinutes: true,
      isActive: true,
      resultsPublished: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          imageUrl: true,
          options: true,
          correct: true,
          marks: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ exam });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = CreateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, maxQuestions: true, _count: { select: { questions: true } } },
  });
  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  if (typeof exam.maxQuestions === "number" && exam._count.questions >= exam.maxQuestions) {
    return NextResponse.json({ error: "MAX_QUESTIONS_REACHED" }, { status: 409 });
  }

  const existingPrompt = await prisma.question.findFirst({
    where: { examId, prompt: parsed.data.prompt },
    select: { id: true },
  });
  if (existingPrompt) {
    return NextResponse.json({ error: "DUPLICATE_QUESTION" }, { status: 409 });
  }

  const maxOrder = await prisma.question.aggregate({
    where: { examId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  let options: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;
  let correct: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;

  if (parsed.data.type === "MULTIPLE_CHOICE") {
    const opts = parsed.data.options ?? [];
    if (opts.length < 2) {
      return NextResponse.json({ error: "MCQ_OPTIONS_REQUIRED" }, { status: 400 });
    }

    if (new Set(opts).size !== opts.length) {
      return NextResponse.json({ error: "DUPLICATE_CHOICES" }, { status: 409 });
    }

    if (!parsed.data.correctChoice || !opts.includes(parsed.data.correctChoice)) {
      return NextResponse.json({ error: "MCQ_CORRECT_REQUIRED" }, { status: 400 });
    }
    options = opts;
    correct = { choice: parsed.data.correctChoice };
  }

  if (parsed.data.type === "TRUE_FALSE") {
    options = ["true", "false"];
    const c = (parsed.data.correctChoice ?? "").toLowerCase();
    if (c !== "true" && c !== "false") {
      return NextResponse.json({ error: "TF_CORRECT_REQUIRED" }, { status: 400 });
    }
    correct = { choice: c };
  }

  const question = await prisma.question.create({
    data: {
      examId,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      marks: parsed.data.marks,
      options,
      correct,
      order: nextOrder,
    },
    select: {
      id: true,
      type: true,
      prompt: true,
      options: true,
      correct: true,
      marks: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_ANSWER_KEY",
      actorId: admin.id,
      examId,
      meta: {
        operation: "CREATE_QUESTION",
        questionId: question.id,
        type: question.type,
        order: question.order,
      },
    },
  });

  const regen = await regenerateResultsForExam(examId);
  if (regen.ok) {
    await prisma.auditLog.create({
      data: {
        action: "REGENERATE_RESULTS",
        actorId: admin.id,
        examId,
        meta: {
          mode: "AUTO",
          reason: "ANSWER_KEY_CHANGED",
          attempts: regen.attempts,
          resultsUpserted: regen.resultsUpserted,
        },
      },
    });
  }

  return NextResponse.json({ question });
}
