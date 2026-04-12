import dynamic from "next/dynamic";
import { getAppSettings } from "@/lib/settings";

const AuthCard = dynamic(
  () => import("@/components/auth/AuthCard").then((m) => m.AuthCard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-surface px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-8 h-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="mb-8 h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="mb-8 grid grid-cols-2 gap-2">
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          </div>
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    ),
  }
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const s = await getAppSettings();
  const verified =
    searchParams.verified === "true" ?
      "success"
    : searchParams.verified === "error" ? "error"
    : null;
  const resetToken = typeof searchParams.reset === "string" ? searchParams.reset : null;
  return (
    <AuthCard
      verified={verified}
      resetToken={resetToken}
      logoUrl={s.logo_url}
      appName={s.app_name}
    />
  );
}
