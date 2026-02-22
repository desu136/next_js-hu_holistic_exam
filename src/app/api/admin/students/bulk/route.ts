import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { parseCsv } from "@/lib/csv";
import { generateStudentCredentials, hashStudentPassword } from "@/lib/students";

const CsvStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  studentId: z.string().min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  const created: Array<{
    username: string;
    studentId: string;
    initialPassword: string;
  }> = [];

  const failed: Array<{ row: number; error: string }> = [];

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];

    const parsed = CsvStudentSchema.safeParse({
      firstName: row.firstName ?? row.FirstName ?? row.firstname,
      lastName: row.lastName ?? row.LastName ?? row.lastname,
      studentId: row.studentId ?? row.StudentId ?? row.student_id ?? row.id,
    });

    if (!parsed.success) {
      failed.push({ row: idx + 2, error: "INVALID_ROW" });
      continue;
    }

    const creds = generateStudentCredentials(parsed.data.firstName, parsed.data.studentId);
    const passwordHash = await hashStudentPassword(creds.password);

    try {
      await prisma.user.create({
        data: {
          role: "STUDENT",
          username: creds.username,
          passwordHash,
          firstName: creds.firstName,
          lastName: parsed.data.lastName?.trim() || null,
          studentId: creds.studentId,
        },
      });

      created.push({
        username: creds.username,
        studentId: creds.studentId,
        initialPassword: creds.password,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "CREATE_FAILED";
      failed.push({ row: idx + 2, error: message });
    }
  }

  return NextResponse.json({
    total: rows.length,
    createdCount: created.length,
    failedCount: failed.length,
    created,
    failed,
  });
}
