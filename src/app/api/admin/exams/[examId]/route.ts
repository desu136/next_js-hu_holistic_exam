import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { hashPassword } from "@/lib/auth";

const PatchExamSchema = z.object({
  title: z.string().min(1).optional(),
  academicYear: z.number().int().min(2000).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  examPassword: z.string().min(1).optional(),
  maxQuestions: z.number().int().min(1).optional().nullable(),
  totalMarks: z.number().int().min(1).optional().nullable(),
});

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
      resultsPublished: true,
      maxQuestions: true,
      totalMarks: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assignments: true,
          attempts: true,
          questions: true,
        },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ exam });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PatchExamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const existing = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  const examPasswordHash = parsed.data.examPassword
    ? await hashPassword(parsed.data.examPassword)
    : undefined;

  const exam = await prisma.exam.update({
    where: { id: examId },
    data: {
      title: parsed.data.title,
      academicYear: parsed.data.academicYear,
      durationMinutes: parsed.data.durationMinutes,
      isActive: parsed.data.isActive,
      examPasswordHash,
      maxQuestions: parsed.data.maxQuestions ?? undefined,
      totalMarks: parsed.data.totalMarks ?? undefined,
    },
    select: {
      id: true,
      title: true,
      academicYear: true,
      durationMinutes: true,
      isActive: true,
      resultsPublished: true,
      maxQuestions: true,
      totalMarks: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ exam });
}
