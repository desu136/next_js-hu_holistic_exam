import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "h_exam_session";
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const INACTIVITY_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const tokenHash = sha256Hex(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastActivityAt: now,
    },
  });

  (await cookies()).set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function revokeSessionByToken(token: string) {
  const tokenHash = sha256Hex(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSessionByToken(token);
  }

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function clearSessionToResponse(res: NextResponse) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await revokeSessionByToken(token);
  }

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export type CurrentUser = {
  id: string;
  role: "ADMIN" | "STUDENT";
  username: string;
  firstName: string | null;
  lastName: string | null;
  studentId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256Hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          username: true,
          firstName: true,
          lastName: true,
          studentId: true,
        },
      },
    },
  });

  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await revokeSessionByToken(token);
    return null;
  }

  if (session.lastActivityAt.getTime() + INACTIVITY_TIMEOUT_MS <= now) {
    await revokeSessionByToken(token);
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });

  return {
    id: session.user.id,
    role: session.user.role,
    username: session.user.username,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    studentId: session.user.studentId,
  };
}
