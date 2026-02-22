import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

function safeExt(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return "";
}

export async function POST(
  req: Request,
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

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
  }

  const ext = safeExt(file.type);
  if (!ext) {
    return NextResponse.json({ error: "UNSUPPORTED_IMAGE_TYPE" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const filename = `${questionId}_${Date.now()}_${hash}${ext}`;

  const relDir = path.join("uploads", "questions");
  const relPath = path.join(relDir, filename);
  const absPath = path.join(process.cwd(), "public", relPath);

  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);

  const imageUrl = `/${relPath.replace(/\\/g, "/")}`;

  const question = await prisma.question.update({
    where: { id: questionId },
    data: { imageUrl },
    select: { id: true, examId: true, imageUrl: true, updatedAt: true },
  });

  return NextResponse.json({ question });
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
