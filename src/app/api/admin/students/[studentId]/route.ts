import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const UpdateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  studentId: z.string().min(1).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { studentId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: studentId } });
  if (!existing || existing.role !== "STUDENT") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        firstName: parsed.data.firstName ?? undefined,
        lastName: parsed.data.lastName === undefined ? undefined : parsed.data.lastName,
        studentId: parsed.data.studentId === undefined ? undefined : parsed.data.studentId,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        studentId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ student: updated });
  } catch (err) {
    console.error("ADMIN_STUDENT_UPDATE_FAILED", err);
    return NextResponse.json({ error: "FAILED_TO_UPDATE" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { studentId } = await params;

  const existing = await prisma.user.findUnique({ where: { id: studentId } });
  if (!existing || existing.role !== "STUDENT") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const counts = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      _count: {
        select: {
          sessions: true,
          assignments: true,
          attempts: true,
        },
      },
    },
  });

  const hasAttempts = (counts?._count.attempts ?? 0) > 0;
  if (hasAttempts) {
    return NextResponse.json({ error: "CANNOT_DELETE_HAS_ATTEMPTS" }, { status: 400 });
  }

  try {
    await prisma.session.deleteMany({ where: { userId: studentId } });
    await prisma.examAssignment.deleteMany({ where: { studentId } });
    await prisma.user.delete({ where: { id: studentId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ADMIN_STUDENT_DELETE_FAILED", err);
    return NextResponse.json({ error: "FAILED_TO_DELETE" }, { status: 500 });
  }
}
