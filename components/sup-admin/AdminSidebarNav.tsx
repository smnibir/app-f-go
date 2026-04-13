"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/sup-admin", label: "Overview" },
  { href: "/sup-admin/users", label: "Users" },
  { href: "/sup-admin/email-templates", label: "Email Templates" },
  { href: "/sup-admin/settings", label: "Settings" },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => {
        const active =
          pathname === n.href ||
          (n.href !== "/sup-admin" && (pathname === n.href || pathname.startsWith(`${n.href}/`)));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`min-h-[48px] rounded-lg px-3 py-3 text-base font-medium ${
              active ? "bg-navy/5 text-navy" : "text-navy hover:bg-gray-50"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="mt-6 min-h-[48px] rounded-lg px-3 py-3 text-base font-semibold text-accent"
      >
        ← Back to App
      </Link>
    </nav>
  );
}
