import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      status: true,
      startedAt: true,
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

  const now = new Date();
  const timeTakenSeconds = attempt.startedAt
    ? Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000))
    : null;

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      timeTakenSeconds: timeTakenSeconds ?? undefined,
      lockToken: null,
      lockUpdatedAt: now,
    },
  });

  (await cookies()).delete(`attempt_lock_${attempt.id}`);

  return NextResponse.json({ ok: true });
}
