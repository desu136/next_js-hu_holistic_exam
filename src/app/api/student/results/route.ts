import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/require-student";

export async function GET() {
  const student = await requireStudent();
  if (!student) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const results = await prisma.result.findMany({
    where: {
      attempt: {
        studentId: student.id,
        exam: { resultsPublished: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      score: true,
      maxScore: true,
      updatedAt: true,
      attempt: {
        select: {
          exam: {
            select: { id: true, title: true, academicYear: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ results });
}
