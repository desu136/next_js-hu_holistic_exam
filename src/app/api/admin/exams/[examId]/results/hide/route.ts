import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { examId } = await params;

  await prisma.exam.update({
    where: { id: examId },
    data: { resultsPublished: false },
  });

  await prisma.auditLog.create({
    data: {
      action: "HIDE_RESULTS",
      actorId: admin.id,
      examId,
    },
  });

  return NextResponse.json({ ok: true });
}
