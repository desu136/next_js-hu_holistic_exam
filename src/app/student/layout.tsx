import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/admin");

  return (
    <div className="app-bg">
      <AppShell user={{ username: user.username, role: "STUDENT" }}>{children}</AppShell>
    </div>
  );
}
