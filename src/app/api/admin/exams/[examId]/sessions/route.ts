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

  const attempts = await prisma.attempt.findMany({
    where: { examId, status: "IN_PROGRESS" },
    orderBy: [{ lockUpdatedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      startedAt: true,
      lockUpdatedAt: true,
      lockToken: true,
      student: { select: { username: true, firstName: true, lastName: true, studentId: true } },
    },
  });

  return NextResponse.json({ exam, attempts });
}
