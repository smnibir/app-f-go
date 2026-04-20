import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ImpersonateClient } from "./ImpersonateClient";

export const dynamic = "force-dynamic";

export default function AuthImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-4">
          <Loader2 className="h-10 w-10 animate-spin text-navy" />
          <p className="text-sm text-gray-600">Loading…</p>
        </div>
      }
    >
      <ImpersonateClient />
    </Suspense>
  );
}
