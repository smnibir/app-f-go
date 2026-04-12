import { Timeline } from "@/components/Timeline";

export default function TimelinePage() {
  return (
    <Timeline
      uploadHref="/dashboard/upload-event?from=timeline"
      editBase="/dashboard/timeline"
    />
  );
}
