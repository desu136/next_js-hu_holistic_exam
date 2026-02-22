import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateStudentCredentials, hashStudentPassword } from "@/lib/students";

const Schema = z.object({
  studentId: z.string().min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({ where: { id: parsed.data.studentId } });
  if (!student || student.role !== "STUDENT") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!student.firstName || !student.studentId) {
    return NextResponse.json({ error: "MISSING_STUDENT_DATA" }, { status: 400 });
  }

  const creds = generateStudentCredentials(student.firstName, student.studentId);
  const passwordHash = await hashStudentPassword(creds.password);

  await prisma.user.update({
    where: { id: student.id },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      action: "ADMIN_RESET_PASSWORD",
      actorId: admin.id,
      targetUserId: student.id,
      meta: {
        generatedUsername: creds.username,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    username: creds.username,
    initialPassword: creds.password,
  });
}
