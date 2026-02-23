import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  try {
    const assignment = await prisma.examAssignment.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
      select: {
        exam: {
          select: {
            id: true,
            title: true,
            academicYear: true,
            durationMinutes: true,
            isActive: true,
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                type: true,
                prompt: true,
                imageUrl: true,
                options: true,
                marks: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!assignment || !assignment.exam.isActive) {
      return NextResponse.json({ error: "NOT_ASSIGNED_OR_INACTIVE" }, { status: 403 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: student.id,
        },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        timeTakenSeconds: true,
        lockedAt: true,
        lockedReason: true,
        lockToken: true,
        answers: {
          select: {
            questionId: true,
            value: true,
            flagged: true,
            answeredAt: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "NO_ATTEMPT" }, { status: 400 });
    }

    if (attempt.status === "IN_PROGRESS" && attempt.lockToken) {
      const token = (await cookies()).get(`attempt_lock_${attempt.id}`)?.value;
      if (!token || token !== attempt.lockToken) {
        return NextResponse.json({ error: "ATTEMPT_LOCKED" }, { status: 409 });
      }
    }

    return NextResponse.json({ exam: assignment.exam, attempt });
  } catch (err) {
    console.error("STUDENT_EXAM_ATTEMPT_FAILED", err);
    const message = err instanceof Error ? err.message : "UNKNOWN";
    return NextResponse.json({ error: "FAILED_TO_LOAD", message }, { status: 500 });
  }
}
