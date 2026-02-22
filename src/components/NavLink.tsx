"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const isHome = href === "/admin" || href === "/student";
  const active = isHome
    ? pathname === href
    : pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <Link
      className={`block whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}
