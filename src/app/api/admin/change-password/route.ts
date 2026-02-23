import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { hashPassword, verifyPassword } from "@/lib/auth";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_CURRENT_PASSWORD" }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
