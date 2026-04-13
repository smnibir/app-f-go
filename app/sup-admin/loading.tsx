import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SupAdminLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 bg-surface px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <LoadingSpinner className="h-9 w-9" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-navy">Loading admin</p>
        <p className="mt-1 text-sm text-gray-500">Preparing your workspace…</p>
      </div>
    </div>
  );
}
