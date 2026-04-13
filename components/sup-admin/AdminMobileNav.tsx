"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

const nav = [
  { href: "/sup-admin", label: "Overview", icon: LayoutDashboard },
  { href: "/sup-admin/users", label: "Users", icon: Users },
  { href: "/sup-admin/email-templates", label: "Email Templates", icon: Mail },
  { href: "/sup-admin/settings", label: "Settings", icon: Settings },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/sup-admin") return pathname === "/sup-admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white text-navy"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ?
          <X className="h-6 w-6" />
        : <Menu className="h-6 w-6" />}
      </button>
      {open ?
        <div
          className="fixed inset-0 z-50 bg-black/30 pt-[56px]"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <nav
            className="border-b border-gray-200 bg-white px-4 py-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="flex flex-col gap-1">
              {nav.map((n) => {
                const active = navActive(pathname, n.href);
                const Icon = n.icon;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-3 text-base font-medium ${
                        active ? "bg-navy/5 text-navy" : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-navy" : "text-gray-500"}`} />
                      {n.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-2 border-t border-gray-100 pt-2">
                <Link
                  href="/dashboard"
                  className="flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold text-accent"
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  Back to app
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      : null}
    </div>
  );
}
