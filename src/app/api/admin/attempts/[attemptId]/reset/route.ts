import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      studentId: true,
      status: true,
      submittedAt: true,
      startedAt: true,
      timeTakenSeconds: true,
      lockToken: true,
      lockUpdatedAt: true,
      _count: { select: { answers: true } },
    },
  });

  if (!attempt) return NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  const isLocked = attempt.status === "LOCKED";
  if (!isLocked && attempt.status !== "SUBMITTED") {
    return NextResponse.json({ error: "ATTEMPT_NOT_RESETTABLE" }, { status: 400 });
  }

  if (!isLocked && attempt._count.answers > 0) {
    return NextResponse.json({ error: "ATTEMPT_HAS_ANSWERS" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.answer.deleteMany({ where: { attemptId } });
    await tx.result.deleteMany({ where: { attemptId } });

    const updatedAttempt = await tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: "NOT_STARTED",
        startedAt: null,
        submittedAt: null,
        timeTakenSeconds: null,
        lockedAt: null,
        lockedReason: null,
        lockToken: null,
        lockUpdatedAt: null,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "ADMIN_RESET_ATTEMPT",
        actorId: admin.id,
        examId: attempt.examId,
        attemptId: attempt.id,
        targetUserId: attempt.studentId,
        meta: {
          reason: "SUBMITTED_WITHOUT_ANSWERS",
        },
      },
    });

    return updatedAttempt;
  });

  return NextResponse.json({ ok: true, attempt: updated });
}
