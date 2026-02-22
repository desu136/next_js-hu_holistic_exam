import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

const Schema = z.object({
  kind: z.enum(["TAB_HIDDEN", "FULLSCREEN_EXIT", "COPY", "PASTE", "CUT", "CONTEXT_MENU"]),
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
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      studentId: true,
      status: true,
      lockToken: true,
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (attempt.status === "SUBMITTED") {
    return NextResponse.json({ error: "ALREADY_SUBMITTED" }, { status: 400 });
  }

  if (attempt.status === "LOCKED") {
    return NextResponse.json({ ok: true, status: "LOCKED" });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "ATTEMPT_NOT_IN_PROGRESS" }, { status: 400 });
  }

  const now = new Date();

  if (attempt.lockToken) {
    const token = (await cookies()).get(`attempt_lock_${attempt.id}`)?.value;
    if (!token || token !== attempt.lockToken) {
      return NextResponse.json({ error: "ATTEMPT_LOCKED" }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: "LOCKED",
        lockedAt: now,
        lockedReason: parsed.data.kind,
        lockToken: null,
        lockUpdatedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "CHEAT_VIOLATION",
        actorId: null,
        examId: attempt.examId,
        attemptId: attempt.id,
        targetUserId: student.id,
        meta: {
          operation: "AUTO_LOCK",
          kind: parsed.data.kind,
        },
      },
    });
  });

  (await cookies()).delete(`attempt_lock_${attempt.id}`);

  return NextResponse.json({ ok: true, status: "LOCKED" });
}
