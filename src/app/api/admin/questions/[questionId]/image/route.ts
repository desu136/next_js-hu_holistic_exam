import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const MAX_BYTES = 1 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { questionId } = await params;

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

    const file = form.get("file") as unknown;
    const maybeBlob = file as { type?: unknown; arrayBuffer?: unknown } | null;
    if (!maybeBlob || typeof maybeBlob.arrayBuffer !== "function") {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
    }

    const mime = typeof maybeBlob.type === "string" ? maybeBlob.type : "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    if (!(["image/png", "image/jpeg", "image/webp"] as const).includes(mime as any)) {
      return NextResponse.json({ error: "UNSUPPORTED_IMAGE_TYPE" }, { status: 400 });
    }

    const buf = Buffer.from(await (maybeBlob as Blob).arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const imageUrl = `data:${mime};base64,${buf.toString("base64")}`;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: { imageUrl },
      select: { id: true, examId: true, imageUrl: true, updatedAt: true },
    });

    return NextResponse.json({ question });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "FAILED_TO_UPLOAD_IMAGE", message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { questionId } = await params;

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

  const question = await prisma.question.update({
    where: { id: questionId },
    data: { imageUrl: null },
    select: { id: true, examId: true, imageUrl: true, updatedAt: true },
  });

  return NextResponse.json({ question });
}
