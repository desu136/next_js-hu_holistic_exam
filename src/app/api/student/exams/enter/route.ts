import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";
import { verifyPassword } from "@/lib/auth";

const Schema = z.object({
  examId: z.string().min(1),
  examPassword: z.string().min(1),
});

export async function POST(req: Request) {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const assignment = await prisma.examAssignment.findUnique({
    where: {
      examId_studentId: {
        examId: parsed.data.examId,
        studentId: student.id,
      },
    },
    select: {
      exam: {
        select: {
          id: true,
          examPasswordHash: true,
          isActive: true,
          durationMinutes: true,
        },
      },
    },
  });

  if (!assignment || !assignment.exam.isActive) {
    return NextResponse.json({ error: "NOT_ASSIGNED_OR_INACTIVE" }, { status: 403 });
  }

  const ok = await verifyPassword(parsed.data.examPassword, assignment.exam.examPasswordHash);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_EXAM_PASSWORD" }, { status: 400 });
  }

  const now = new Date();

  const existing = await prisma.attempt.findUnique({
    where: {
      examId_studentId: {
        examId: assignment.exam.id,
        studentId: student.id,
      },
    },
    select: { id: true, status: true, startedAt: true, lockToken: true },
  });

  if (existing?.status === "SUBMITTED") {
    return NextResponse.json({ ok: true, attemptId: existing.id, status: existing.status });
  }

  if (existing?.status && String(existing.status) === "LOCKED") {
    return NextResponse.json({ error: "ATTEMPT_LOCKED_BY_ADMIN" }, { status: 423 });
  }

  if (existing?.status === "IN_PROGRESS" && existing.lockToken) {
    const cookieName = `attempt_lock_${existing.id}`;
    const token = (await cookies()).get(cookieName)?.value;
    if (!token || token !== existing.lockToken) {
      return NextResponse.json({ error: "ATTEMPT_LOCKED" }, { status: 409 });
    }
  }

  const lockToken = existing?.lockToken ?? crypto.randomUUID();

  const attempt = existing
    ? await prisma.attempt.update({
        where: { id: existing.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: existing.startedAt ?? now,
          lockToken,
          lockUpdatedAt: now,
        },
        select: { id: true, status: true },
      })
    : await prisma.attempt.create({
        data: {
          examId: assignment.exam.id,
          studentId: student.id,
          status: "IN_PROGRESS",
          startedAt: now,
          lockToken,
          lockUpdatedAt: now,
        },
        select: { id: true, status: true },
      });

  (await cookies()).set({
    name: `attempt_lock_${attempt.id}`,
    value: lockToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.json({ ok: true, attemptId: attempt.id, status: attempt.status });
}
