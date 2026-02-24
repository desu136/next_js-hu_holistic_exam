import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

function timeUpCutoff(durationMinutes: number) {
  return new Date(Date.now() - durationMinutes * 60 * 1000);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      academicYear: true,
      durationMinutes: true,
      isActive: true,
    },
  });

  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  const cutoff = timeUpCutoff(exam.durationMinutes);
  const expired = await prisma.attempt.findMany({
    where: {
      examId,
      status: "IN_PROGRESS",
      startedAt: { not: null, lte: cutoff },
    },
    select: { id: true },
  });

  if (expired.length > 0) {
    const now = new Date();
    const durationSeconds = exam.durationMinutes * 60;
    await prisma.attempt.updateMany({
      where: { id: { in: expired.map((a) => a.id) } },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        timeTakenSeconds: durationSeconds,
        lockToken: null,
        lockUpdatedAt: now,
      },
    });
  }

  const attempts = await prisma.attempt.findMany({
    where: { examId, status: { in: ["IN_PROGRESS", "LOCKED"] } },
    orderBy: [{ lockUpdatedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      startedAt: true,
      lockUpdatedAt: true,
      lockToken: true,
      lockedAt: true,
      lockedReason: true,
      student: { select: { username: true, firstName: true, lastName: true, studentId: true } },
    },
  });

  return NextResponse.json({ exam, attempts });
}
