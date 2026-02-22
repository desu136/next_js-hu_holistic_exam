import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(
  _req: Request,
  _ctx: { params: Promise<{ examId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  return NextResponse.json({ error: "SHORT_ANSWER_DISABLED" }, { status: 410 });

}
