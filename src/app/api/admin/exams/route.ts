import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { hashPassword } from "@/lib/auth";

const CreateExamSchema = z.object({
  title: z.string().min(1),
  academicYear: z.number().int().min(2000),
  durationMinutes: z.number().int().min(1),
  examPassword: z.string().min(1),
  isActive: z.boolean().optional(),
  maxQuestions: z.number().int().min(1).optional().nullable(),
  totalMarks: z.number().int().min(1).optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const exams = await prisma.exam.findMany({
      orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
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
        _count: {
          select: {
            assignments: true,
            attempts: true,
            questions: true,
          },
        },
      },
    } as any);

    return NextResponse.json({ exams });
  } catch (err) {
    console.error("ADMIN_EXAMS_GET_FAILED", err);
    return NextResponse.json({ error: "FAILED_TO_LOAD_EXAMS" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateExamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const examPasswordHash = await hashPassword(parsed.data.examPassword);

  try {
    const exam = await prisma.exam.create({
      data: {
        title: parsed.data.title,
        academicYear: parsed.data.academicYear,
        durationMinutes: parsed.data.durationMinutes,
        examPasswordHash,
        isActive: parsed.data.isActive ?? false,
        maxQuestions: parsed.data.maxQuestions ?? null,
        totalMarks: parsed.data.totalMarks ?? null,
      } as any,
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
      } as any,
    } as any);

    return NextResponse.json({ exam });
  } catch (err) {
    console.error("ADMIN_EXAMS_CREATE_FAILED", err);
    const message = err instanceof Error ? err.message : "UNKNOWN";
    return NextResponse.json(
      { error: "FAILED_TO_CREATE", message },
      { status: 500 },
    );
  }
}
