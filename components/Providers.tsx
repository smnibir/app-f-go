"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toaster";

/**
 * Session is loaded client-side via /api/auth/session so it always uses the
 * browser's origin (correct port). Passing server auth() here breaks when
 * NEXTAUTH_URL does not match that origin.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
