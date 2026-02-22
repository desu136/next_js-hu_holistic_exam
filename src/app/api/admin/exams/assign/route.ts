import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const Schema = z.object({
  examId: z.string().min(1),
  studentUserIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({ where: { id: parsed.data.examId } });
  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  const students = await prisma.user.findMany({
    where: { id: { in: parsed.data.studentUserIds }, role: "STUDENT" },
    select: { id: true },
  });

  if (students.length === 0) {
    return NextResponse.json({ error: "NO_STUDENTS" }, { status: 400 });
  }

  await prisma.examAssignment.createMany({
    data: students.map((s) => ({ examId: exam.id, studentId: s.id })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, assignedCount: students.length });
}
