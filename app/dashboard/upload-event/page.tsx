import { EventForm } from "@/components/EventForm";

export default function UploadEventPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const from = searchParams.from === "timeline" ? "timeline" : "dial";
  const back = from === "timeline" ? "/dashboard/timeline" : "/dashboard";
  return <EventForm mode="create" backHref={back} />;
}
