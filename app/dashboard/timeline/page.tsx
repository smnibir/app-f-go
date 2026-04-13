import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const Timeline = dynamic(
  () => import("@/components/Timeline").then((m) => ({ default: m.Timeline })),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center bg-surface">
        <LoadingSpinner />
      </div>
    ),
    ssr: true,
  }
);

export default function TimelinePage() {
  return (
    <Timeline
      uploadHref="/dashboard/upload-event?from=timeline"
      editBase="/dashboard/timeline"
    />
  );
}
