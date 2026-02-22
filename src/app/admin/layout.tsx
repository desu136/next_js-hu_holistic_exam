import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/student");

  return (
    <div className="app-bg">
      <AppShell user={{ username: user.username, role: "ADMIN" }}>{children}</AppShell>
    </div>
  );
}
