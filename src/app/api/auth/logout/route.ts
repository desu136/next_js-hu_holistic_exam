import { NextResponse } from "next/server";
import { clearSessionToResponse } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  await clearSessionToResponse(res);
  return res;
}
