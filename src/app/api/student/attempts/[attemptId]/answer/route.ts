import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

const Schema = z.object({
  questionId: z.string().min(1),
  value: z.any().optional(),
  flagged: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { attemptId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      studentId: true,
      examId: true,
      lockToken: true,
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (String(attempt.status) === "LOCKED") {
    return NextResponse.json({ error: "ATTEMPT_LOCKED_BY_ADMIN" }, { status: 423 });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "ATTEMPT_NOT_IN_PROGRESS" }, { status: 400 });
  }

  if (attempt.lockToken) {
    const token = (await cookies()).get(`attempt_lock_${attempt.id}`)?.value;
    if (!token || token !== attempt.lockToken) {
      return NextResponse.json({ error: "ATTEMPT_LOCKED" }, { status: 409 });
    }
  }

  const question = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    select: { id: true, examId: true },
  });

  if (!question || question.examId !== attempt.examId) {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }

  const updated = await prisma.answer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: attempt.id,
        questionId: question.id,
      },
    },
    update: {
      value: parsed.data.value,
      flagged: parsed.data.flagged ?? undefined,
      answeredAt: new Date(),
    },
    create: {
      attemptId: attempt.id,
      questionId: question.id,
      value: parsed.data.value,
      flagged: parsed.data.flagged ?? false,
      answeredAt: new Date(),
    },
    select: {
      questionId: true,
      value: true,
      flagged: true,
      answeredAt: true,
    },
  });

  return NextResponse.json({ ok: true, answer: updated });
}
