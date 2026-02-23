import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        academicYear: true,
        durationMinutes: true,
        resultsPublished: true,
        isActive: true,
        _count: { select: { assignments: true, attempts: true, questions: true } },
      },
    });

    if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

    const lockedAttempts = await prisma.attempt.findMany({
      where: { examId, status: "LOCKED" },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        lockedAt: true,
        lockedReason: true,
        _count: { select: { answers: true } },
        student: { select: { username: true, firstName: true, lastName: true, studentId: true } },
      },
    });

    const results = await prisma.result.findMany({
      where: { attempt: { examId } },
      orderBy: { updatedAt: "desc" },
      select: {
        score: true,
        maxScore: true,
        updatedAt: true,
        attempt: {
          select: {
            id: true,
            status: true,
            _count: { select: { answers: true } },
            student: { select: { username: true, firstName: true, lastName: true, studentId: true } },
          },
        },
      },
    });

    return NextResponse.json({ exam, results, lockedAttempts });
  } catch (err) {
    console.error("ADMIN_RESULTS_SUMMARY_FAILED", err);
    const message = err instanceof Error ? err.message : "UNKNOWN";
    return NextResponse.json({ error: "FAILED_TO_LOAD", message }, { status: 500 });
  }
}
