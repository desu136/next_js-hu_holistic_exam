import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { regenerateResultsForExam } from "@/lib/results";

const Schema = z.object({
  questionId: z.string().min(1),
  direction: z.enum(["UP", "DOWN"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const q = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    select: { id: true, examId: true, order: true },
  });

  if (!q || q.examId !== examId) {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }

  const targetOrder = parsed.data.direction === "UP" ? q.order - 1 : q.order + 1;
  if (targetOrder < 1) return NextResponse.json({ ok: true });

  const neighbor = await prisma.question.findFirst({
    where: { examId, order: targetOrder },
    select: { id: true, order: true },
  });

  if (!neighbor) return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    await tx.question.update({ where: { id: q.id }, data: { order: 0 } });
    await tx.question.update({ where: { id: neighbor.id }, data: { order: q.order } });
    await tx.question.update({ where: { id: q.id }, data: { order: neighbor.order } });
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_ANSWER_KEY",
      actorId: admin.id,
      examId,
      meta: {
        operation: "REORDER_QUESTION",
        questionId: q.id,
        from: q.order,
        to: targetOrder,
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

  return NextResponse.json({ ok: true });
}
