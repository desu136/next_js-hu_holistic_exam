import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { regenerateResultsForExam } from "@/lib/results";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  const regen = await regenerateResultsForExam(examId);
  if (!regen.ok) return NextResponse.json({ error: regen.error }, { status: 404 });

  await prisma.auditLog.create({
    data: {
      action: "REGENERATE_RESULTS",
      actorId: admin.id,
      examId,
      meta: {
        attempts: regen.attempts,
        resultsUpserted: regen.resultsUpserted,
        mode: "MANUAL",
      },
    },
  });

  return NextResponse.json({ ok: true, attempts: regen.attempts, resultsUpserted: regen.resultsUpserted });
}
