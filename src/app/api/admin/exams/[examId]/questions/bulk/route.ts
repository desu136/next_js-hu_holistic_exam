import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { regenerateResultsForExam } from "@/lib/results";
import { Prisma } from "@prisma/client";

const QuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

const BulkItemSchema = z.object({
  type: QuestionTypeSchema,
  prompt: z.string().min(1),
  marks: z.number().int().min(1).optional(),
  options: z.array(z.string().min(1)).optional(),
  correctChoice: z.string().optional(),
});

const BulkSchema = z.object({
  questions: z.array(BulkItemSchema).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, maxQuestions: true, _count: { select: { questions: true } } },
  });
  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  if (typeof exam.maxQuestions === "number") {
    const remaining = exam.maxQuestions - exam._count.questions;
    if (remaining <= 0) {
      return NextResponse.json({ error: "MAX_QUESTIONS_REACHED" }, { status: 409 });
    }
    if (parsed.data.questions.length > remaining) {
      return NextResponse.json(
        { error: "MAX_QUESTIONS_EXCEEDED", remaining },
        { status: 409 },
      );
    }
  }

  const maxOrder = await prisma.question.aggregate({
    where: { examId },
    _max: { order: true },
  });
  let order = (maxOrder._max.order ?? 0) + 1;

  const createdIds: string[] = [];
  const failures: { index: number; error: string }[] = [];
  const seenPrompts = new Set<string>();

  for (let i = 0; i < parsed.data.questions.length; i++) {
    const q = parsed.data.questions[i];

    try {
      if (seenPrompts.has(q.prompt)) throw new Error("DUPLICATE_QUESTION");
      seenPrompts.add(q.prompt);

      const dup = await prisma.question.findFirst({
        where: { examId, prompt: q.prompt },
        select: { id: true },
      });
      if (dup) throw new Error("DUPLICATE_QUESTION");

      let options: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;
      let correct: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;

      if (q.type === "MULTIPLE_CHOICE") {
        const opts = q.options ?? [];
        if (opts.length < 2) throw new Error("MCQ_OPTIONS_REQUIRED");
        if (new Set(opts).size !== opts.length) throw new Error("DUPLICATE_CHOICES");
        if (!q.correctChoice || !opts.includes(q.correctChoice)) throw new Error("MCQ_CORRECT_REQUIRED");
        options = opts;
        correct = { choice: q.correctChoice };
      }

      if (q.type === "TRUE_FALSE") {
        options = ["true", "false"];
        const c = (q.correctChoice ?? "").toLowerCase();
        if (c !== "true" && c !== "false") throw new Error("TF_CORRECT_REQUIRED");
        correct = { choice: c };
      }

      const created = await prisma.question.create({
        data: {
          examId,
          type: q.type,
          prompt: q.prompt,
          marks: q.marks ?? 1,
          options,
          correct,
          order,
        },
        select: { id: true },
      });

      createdIds.push(created.id);
      order += 1;
    } catch (e) {
      failures.push({ index: i, error: e instanceof Error ? e.message : "FAILED" });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_ANSWER_KEY",
      actorId: admin.id,
      examId,
      meta: {
        operation: "BULK_CREATE_QUESTIONS",
        created: createdIds.length,
        failed: failures.length,
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

  return NextResponse.json({ ok: true, created: createdIds.length, failures });
}
