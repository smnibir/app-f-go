"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export function DashboardHeaderMenu({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const email = user.email || "";
  const display = user.name || email;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Avatar src={user.avatarUrl || user.image} name={user.name} email={email} size={44} />
        <span className="hidden max-w-[160px] truncate text-base font-medium text-navy sm:inline">
          {display}
        </span>
        <ChevronDown className="h-5 w-5 text-gray-500" />
      </button>
      {open ?
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-gray-200 bg-white py-2 shadow-md">
          <Link
            href="/dashboard/settings"
            className="block min-h-[48px] px-4 py-3 text-base text-navy hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            className="block w-full min-h-[48px] px-4 py-3 text-left text-base text-navy hover:bg-gray-50"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            Sign Out
          </button>
        </div>
      : null}
    </div>
  );
}
