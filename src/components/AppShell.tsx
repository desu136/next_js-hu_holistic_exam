import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { NavLink } from "@/components/NavLink";

type ShellUser = {
  username: string;
  role: "ADMIN" | "STUDENT";
};

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const homeHref = user.role === "ADMIN" ? "/admin" : "/student";

  const nav =
    user.role === "ADMIN"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/students", label: "Students" },
          { href: "/admin/exams", label: "Exams" },
          { href: "/admin/settings", label: "Settings" },
        ]
      : [
          { href: "/student", label: "Home" },
          { href: "/student/exams", label: "Exams" },
          { href: "/student/results", label: "Results" },
          { href: "/student/settings", label: "Settings" },
        ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-40 border-b border-emerald-100 bg-gradient-to-b from-emerald-200/80 to-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 md:px-10">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight text-emerald-900" href={homeHref}>
              Holistic Exam
            </Link>
            <span className="hidden text-xs text-zinc-500 md:inline">{user.role}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-zinc-700 md:block">
              Signed in as <span className="font-mono text-zinc-900">{user.username}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 pb-3 md:hidden">
          <div className="overflow-auto rounded-2xl border border-emerald-100 bg-white/70 p-2 backdrop-blur">
            <nav className="flex items-center gap-1">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-6 md:px-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-[72px] rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <div className="px-3 pb-2 text-xs font-medium text-emerald-900/70">Navigation</div>
            <nav className="grid gap-1">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main>{children}</main>
          <footer className="mt-auto border-t border-emerald-100 bg-gradient-to-b from-white to-emerald-100/60 pt-6 text-xs text-zinc-600">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-medium text-emerald-900">Holistic Exam</span> — Online Exam System
              </div>
              <div>For support, contact your administrator.</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
