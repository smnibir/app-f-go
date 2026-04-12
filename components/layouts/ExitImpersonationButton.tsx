"use client";

import { signIn } from "next-auth/react";

export function ExitImpersonationButton({ name }: { name: string }) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-base text-amber-900">
      Acting as <strong>{name}</strong>.{" "}
      <button
        type="button"
        className="font-semibold text-navy underline"
        onClick={async () => {
          const res = await fetch("/api/auth/exit-impersonate", { method: "POST" });
          const data = (await res.json()) as { token?: string; error?: string };
          if (!data.token) return;
          await signIn("exit-impersonate", { token: data.token, callbackUrl: "/sup-admin" });
        }}
      >
        Exit
      </button>
    </div>
  );
}
