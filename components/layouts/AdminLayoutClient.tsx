"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  Mail,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { AdminMobileNav } from "@/components/sup-admin/AdminMobileNav";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/sup-admin", label: "Overview", icon: LayoutDashboard },
  { href: "/sup-admin/users", label: "Users", icon: Users },
  { href: "/sup-admin/email-templates", label: "Email Templates", icon: Mail },
  { href: "/sup-admin/settings", label: "Settings", icon: Settings },
] as const;

const STORAGE_KEY = "fgo-admin-sidebar-collapsed";

function BrandMark({ logoUrl, appName }: { logoUrl: string; appName: string }) {
  if (logoUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl.trim()}
        alt=""
        className="h-auto max-h-[40px] w-auto object-contain"
      />
    );
  }
  return (
    <span className="font-sans text-2xl font-bold tracking-tight text-navy">
      {appName?.trim() || "FutureGo"}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/sup-admin") return pathname === "/sup-admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminLayoutClient({
  children,
  userEmail,
  appName,
  logoUrl,
}: {
  children: React.ReactNode;
  userEmail: string;
  appName: string;
  logoUrl: string;
}) {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 md:py-4 lg:px-6">
          <Link href="/sup-admin" className="flex min-h-[48px] shrink-0 items-center gap-3">
            <BrandMark logoUrl={logoUrl} appName={appName} />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-sm text-gray-600 md:inline">
              {userEmail}
            </span>
            <AdminMobileNav />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1">
        <aside
          className={cn(
            "relative z-30 hidden shrink-0 border-r border-gray-200 bg-white transition-[width] duration-300 ease-out md:sticky md:top-[4.5rem] md:flex md:h-[calc(100dvh-4.5rem)] md:max-h-[calc(100dvh-4.5rem)] md:flex-col md:overflow-hidden md:self-start",
            collapsed ? "w-[4.25rem]" : "w-64"
          )}
        >
          <div
            className={cn(
              "flex h-full min-h-0 flex-col border-b border-gray-100 py-4",
              collapsed ? "items-center px-2" : "px-4"
            )}
          >
            {!collapsed ?
              <div className="mb-4">
                <p className="font-serif text-lg font-bold leading-tight text-navy">Console</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500">Administration</p>
              </div>
            : <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5"
                title="Console"
              >
                <Sparkles className="h-5 w-5 text-navy" aria-hidden />
              </div>
            }

            <nav className="flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                      active ? "bg-navy/10 text-navy" : "text-gray-700 hover:bg-gray-50 hover:text-navy"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-navy" : "text-gray-500")} />
                    {!collapsed ?
                      <span>{label}</span>
                    : null}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/dashboard"
              title={collapsed ? "Back to app" : undefined}
              className={cn(
                "mt-6 flex min-h-[44px] items-center gap-3 rounded-xl text-sm font-semibold text-accent transition hover:bg-accent/10",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              )}
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              {!collapsed ?
                <span>Back to app</span>
              : null}
            </Link>

            <button
              type="button"
              onClick={toggleCollapsed}
              className={cn(
                "mt-auto flex min-h-[40px] items-center gap-2 rounded-lg pt-4 text-xs font-medium text-gray-500 transition hover:text-navy",
                collapsed ? "justify-center" : "px-1"
              )}
            >
              {collapsed ?
                <PanelLeft className="h-4 w-4 shrink-0" />
              : <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span>Collapse</span>
                </>
              }
            </button>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 px-4 py-6 md:py-8 lg:px-8">{children}</div>
      </div>

      <footer className="mt-auto w-full border-t border-gray-200 bg-white">
        <div className="flex w-full flex-col gap-4 px-4 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="shrink-0 opacity-90">
              <BrandMark logoUrl={logoUrl} appName={appName} />
            </span>
            <p className="text-sm text-gray-600">
              Admin tools and analytics. Changes may affect all users.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="font-medium text-accent hover:underline">
              Main app
            </Link>
            <span aria-hidden>·</span>
            <span>© {year}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
