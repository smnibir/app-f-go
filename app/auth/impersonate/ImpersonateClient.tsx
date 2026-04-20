"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * Consumes a one-time impersonation token (from admin) and establishes a session as the target user.
 */
export function ImpersonateClient() {
  const params = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);
  const t = params.get("t");

  useEffect(() => {
    if (!t) {
      setMsg("Missing token.");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await signIn("impersonate", { token: t, redirect: false });
      if (cancelled) return;
      if (res?.error) {
        setMsg("This link is invalid or expired. Ask your admin for a new one.");
        return;
      }
      window.location.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4">
      {!msg ?
        <>
          <LoadingSpinner className="h-10 w-10 border-2 border-navy/25 border-t-navy" />
          <p className="text-sm text-gray-600">Opening dashboard…</p>
        </>
      : <p className="max-w-md text-center text-sm text-red-700">{msg}</p>}
    </div>
  );
}
