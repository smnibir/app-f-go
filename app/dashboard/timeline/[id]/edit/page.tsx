import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventForm, type EventFormInitial } from "@/components/EventForm";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();
  const { id } = await params;
  const entry = await prisma.timelineEntry.findFirst({
    where: { id, userId: session.user.id },
    include: { assets: true },
  });
  if (!entry) notFound();

  const initial: EventFormInitial = {
    title: entry.title,
    description: entry.description,
    entryDate: entry.entryDate,
    publishImmediately: entry.status === "PUBLISHED" && !entry.publishAt,
    publishAt: entry.publishAt,
    status: entry.status,
    assets: entry.assets.map((a) => ({
      id: a.publicId,
      assetId: a.id,
      url: a.url,
      publicId: a.publicId,
      type: a.type,
      filename: a.filename,
      size: a.size ?? undefined,
    })),
  };

  const from = searchParams.from === "timeline" ? "timeline" : "dial";
  const back = from === "timeline" ? "/dashboard/timeline" : "/dashboard";

  return <EventForm mode="edit" entryId={entry.id} backHref={back} initial={initial} />;
}
