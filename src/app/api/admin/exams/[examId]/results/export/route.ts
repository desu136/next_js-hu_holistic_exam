import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuotes = /[\",\n\r]/.test(s);
  const escaped = s.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

type BreakdownItem = {
  questionId: string;
  marks: number;
  earned: number;
  correct?: boolean;
  manual?: boolean;
};

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
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, marks: true },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 404 });

  const results = await prisma.result.findMany({
    where: { attempt: { examId } },
    orderBy: [{ attempt: { student: { username: "asc" } } }],
    select: {
      score: true,
      maxScore: true,
      updatedAt: true,
      breakdown: true,
      attempt: {
        select: {
          id: true,
          student: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
      },
    },
  });

  const header = [
    "username",
    "studentId",
    "firstName",
    "lastName",
    "score",
    "maxScore",
    "updatedAt",
    ...exam.questions.map((q) => `Q${q.order}_earned`),
  ];

  const qIndex = new Map(exam.questions.map((q) => [q.id, q] as const));

  const lines: string[] = [];
  lines.push(header.map(csvEscape).join(","));

  for (const r of results) {
    const breakdownArray: BreakdownItem[] = Array.isArray(r.breakdown)
      ? (r.breakdown as BreakdownItem[])
      : [];

    const earnedByQuestionId = new Map<string, number>();
    for (const b of breakdownArray) {
      if (!b || typeof b.questionId !== "string") continue;
      if (!qIndex.has(b.questionId)) continue;
      earnedByQuestionId.set(b.questionId, typeof b.earned === "number" ? b.earned : 0);
    }

    const row = [
      r.attempt.student.username,
      r.attempt.student.studentId ?? "",
      r.attempt.student.firstName ?? "",
      r.attempt.student.lastName ?? "",
      r.score,
      r.maxScore,
      r.updatedAt.toISOString(),
      ...exam.questions.map((q) => earnedByQuestionId.get(q.id) ?? ""),
    ];

    lines.push(row.map(csvEscape).join(","));
  }

  const csv = lines.join("\n");
  const filename = `results_${exam.academicYear}_${exam.title.replace(/[^a-z0-9-_]+/gi, "_")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
