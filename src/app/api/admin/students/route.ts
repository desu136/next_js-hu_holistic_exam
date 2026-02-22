import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateStudentCredentials, hashStudentPassword } from "@/lib/students";

const CreateStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().nullable(),
  studentId: z.string().min(1),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      studentId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { firstName, lastName, studentId } = parsed.data;
  const creds = generateStudentCredentials(firstName, studentId);
  const passwordHash = await hashStudentPassword(creds.password);

  try {
    const created = await prisma.user.create({
      data: {
        role: "STUDENT",
        username: creds.username,
        passwordHash,
        firstName: creds.firstName,
        lastName: lastName ?? null,
        studentId: creds.studentId,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        studentId: true,
      },
    });

    return NextResponse.json({ student: created, initialPassword: creds.password });
  } catch {
    return NextResponse.json(
      { error: "DUPLICATE_USERNAME_OR_STUDENT_ID" },
      { status: 409 },
    );
  }
}
