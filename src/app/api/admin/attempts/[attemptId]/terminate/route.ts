import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, status: true },
  });

  if (!attempt) return NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });

  if (attempt.status === "SUBMITTED") {
    return NextResponse.json({ error: "ALREADY_SUBMITTED" }, { status: 400 });
  }

  if (attempt.status === "LOCKED") {
    return NextResponse.json({ ok: true, status: "LOCKED" });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "ATTEMPT_NOT_IN_PROGRESS" }, { status: 400 });
  }

  const now = new Date();

  const updated = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "LOCKED",
      lockedAt: now,
      lockedReason: "ADMIN_TERMINATE",
      lockToken: null,
      lockUpdatedAt: now,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ ok: true, attempt: updated });
}
