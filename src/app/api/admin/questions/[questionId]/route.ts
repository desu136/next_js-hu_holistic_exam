import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { regenerateResultsForExam } from "@/lib/results";
import { Prisma } from "@prisma/client";

const QuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

const UpdateQuestionSchema = z.object({
  type: QuestionTypeSchema.optional(),
  prompt: z.string().min(1).optional(),
  marks: z.number().int().min(1).optional(),
  order: z.number().int().min(1).optional(),
  options: z.array(z.string().min(1)).optional(),
  correctChoice: z.string().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      examId: true,
      type: true,
      prompt: true,
      imageUrl: true,
      options: true,
      correct: true,
      marks: true,
      order: true,
      updatedAt: true,
    },
  });

  if (!question) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ question });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { questionId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, examId: true, type: true },
  });
  if (!existing) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

  if (parsed.data.prompt) {
    const dup = await prisma.question.findFirst({
      where: {
        examId: existing.examId,
        prompt: parsed.data.prompt,
        NOT: { id: questionId },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "DUPLICATE_QUESTION" }, { status: 409 });
    }
  }

  const nextType = parsed.data.type ?? existing.type;

  let options: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;
  let correct: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined = undefined;

  if (nextType === "MULTIPLE_CHOICE") {
    const opts = parsed.data.options;
    const c = parsed.data.correctChoice ?? undefined;

    if (opts) {
      if (opts.length < 2) return NextResponse.json({ error: "MCQ_OPTIONS_REQUIRED" }, { status: 400 });

      if (new Set(opts).size !== opts.length) {
        return NextResponse.json({ error: "DUPLICATE_CHOICES" }, { status: 409 });
      }

      options = opts;
      if (c !== undefined && c !== null) {
        if (!opts.includes(c)) return NextResponse.json({ error: "MCQ_CORRECT_INVALID" }, { status: 400 });
        correct = { choice: c };
      }
    } else if (c !== undefined) {
      if (c === null) {
        correct = Prisma.DbNull;
      } else {
        const current = await prisma.question.findUnique({
          where: { id: questionId },
          select: { options: true },
        });
        const currentOpts = Array.isArray(current?.options) ? (current?.options as unknown[]).map(String) : [];
        if (!currentOpts.includes(c)) return NextResponse.json({ error: "MCQ_CORRECT_INVALID" }, { status: 400 });
        correct = { choice: c };
      }
    }
  }

  if (nextType === "TRUE_FALSE") {
    const c = parsed.data.correctChoice;
    options = ["true", "false"];

    if (c !== undefined) {
      if (c === null) return NextResponse.json({ error: "TF_CORRECT_REQUIRED" }, { status: 400 });
      const v = c.toLowerCase();
      if (v !== "true" && v !== "false") return NextResponse.json({ error: "TF_CORRECT_REQUIRED" }, { status: 400 });
      correct = { choice: v };
    }
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      marks: parsed.data.marks,
      order: parsed.data.order,
      options,
      correct,
    },
    select: {
      id: true,
      examId: true,
      type: true,
      prompt: true,
      imageUrl: true,
      options: true,
      correct: true,
      marks: true,
      order: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_ANSWER_KEY",
      actorId: admin.id,
      examId: updated.examId,
      meta: {
        operation: "UPDATE_QUESTION",
        questionId: updated.id,
      },
    },
  });

  const regen = await regenerateResultsForExam(updated.examId);
  if (regen.ok) {
    await prisma.auditLog.create({
      data: {
        action: "REGENERATE_RESULTS",
        actorId: admin.id,
        examId: updated.examId,
        meta: {
          mode: "AUTO",
          reason: "ANSWER_KEY_CHANGED",
          attempts: regen.attempts,
          resultsUpserted: regen.resultsUpserted,
        },
      },
    });
  }

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { questionId } = await params;

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, examId: true },
  });
  if (!existing) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

  await prisma.question.delete({ where: { id: questionId } });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_ANSWER_KEY",
      actorId: admin.id,
      examId: existing.examId,
      meta: {
        operation: "DELETE_QUESTION",
        questionId: existing.id,
      },
    },
  });

  const regen = await regenerateResultsForExam(existing.examId);
  if (regen.ok) {
    await prisma.auditLog.create({
      data: {
        action: "REGENERATE_RESULTS",
        actorId: admin.id,
        examId: existing.examId,
        meta: {
          mode: "AUTO",
          reason: "ANSWER_KEY_CHANGED",
          attempts: regen.attempts,
          resultsUpserted: regen.resultsUpserted,
        },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
