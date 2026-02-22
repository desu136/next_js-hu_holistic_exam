import { getCurrentUser } from "@/lib/auth";

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return null;
  }
  return user;
}
