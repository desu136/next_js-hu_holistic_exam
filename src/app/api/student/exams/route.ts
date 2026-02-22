import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

export async function GET() {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const latest = await prisma.exam.findFirst({
    orderBy: { academicYear: "desc" },
    select: { academicYear: true },
  });

  const year = latest?.academicYear;
  if (!year) return NextResponse.json({ year: null, exams: [] });

  const assignments = await prisma.examAssignment.findMany({
    where: {
      studentId: student.id,
      exam: {
        academicYear: year,
        isActive: true,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      exam: {
        select: {
          id: true,
          title: true,
          academicYear: true,
          durationMinutes: true,
          isActive: true,
        },
      },
    },
  });

  const examIds = assignments.map((a) => a.exam.id);

  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: student.id,
      examId: { in: examIds },
    },
    select: { examId: true, status: true },
  });

  const attemptMap = new Map(attempts.map((a) => [a.examId, a.status] as const));

  const exams = assignments.map((a) => ({
    ...a.exam,
    status: attemptMap.get(a.exam.id) ?? "NOT_STARTED",
  }));

  return NextResponse.json({ year, exams });
}
