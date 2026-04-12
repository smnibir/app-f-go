"use client";

import Image from "next/image";
import Link from "next/link";
import { format, isAfter } from "date-fns";
import { Clock, Pencil, FileText, Music } from "lucide-react";
import type { Asset, TimelineEntry } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Entry = TimelineEntry & { assets: Asset[] };

export function TimelineCard({
  entry,
  editHref,
  now = new Date(),
  className,
}: {
  entry: Entry;
  editHref: string;
  now?: Date;
  className?: string;
}) {
  const d = entry.entryDate;
  const scheduledFuture =
    entry.status === "SCHEDULED" && entry.publishAt && isAfter(entry.publishAt, now);

  const images = entry.assets.filter((a) => a.type === "IMAGE");
  const videos = entry.assets.filter((a) => a.type === "VIDEO");
  const audios = entry.assets.filter((a) => a.type === "AUDIO");
  const pdfs = entry.assets.filter((a) => a.type === "PDF");

  const thumbImage = images[0];
  const thumbVideo = !thumbImage && videos[0] ? videos[0] : null;
  const extraImages = thumbImage ? images.slice(1) : images;
  const extraVideos = thumbVideo ? videos.slice(1) : videos;

  return (
    <article
      className={cn(
        "relative max-w-xl rounded-xl border border-blue-200/90 bg-white p-4 shadow-sm md:p-5",
        scheduledFuture && "bg-surface/90",
        className
      )}
    >
      <p className="mb-3 text-[15px] text-gray-500">
        Uploaded on: {format(entry.updatedAt, "d MMM yyyy")}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-36 sm:w-36">
          {thumbImage ?
            <Image
              src={thumbImage.url}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          : thumbVideo ?
            <video src={thumbVideo.url} className="h-full w-full object-cover" muted playsInline />
          : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[15px] text-gray-400">
              No photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <p className="text-[15px] text-gray-500">{format(d, "d MMM yyyy")}</p>
            <Link href={editHref} className="shrink-0">
              <Button type="button" variant="ghost" className="!w-auto min-h-[44px] px-2">
                <Pencil className="h-5 w-5 text-navy" />
                <span className="sr-only">Edit</span>
              </Button>
            </Link>
          </div>
          <h2 className="text-xl font-bold leading-snug text-navy">{entry.title}</h2>
          {entry.description ?
            <p className="mt-2 text-base leading-relaxed text-gray-600">{entry.description}</p>
          : null}

          {scheduledFuture && entry.publishAt ?
            <p className="mt-2 text-[15px] text-gray-600">
              <Clock className="mr-1 inline h-4 w-4 text-accent" />
              Appears {format(entry.publishAt, "d MMMM yyyy 'at' HH:mm")}
            </p>
          : null}

          {extraImages.length > 0 ?
            <div className="mt-3 grid grid-cols-3 gap-1">
              {extraImages.slice(0, 3).map((a) => (
                <div key={a.id} className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                  <Image src={a.url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          : null}

          {pdfs.map((a) => (
            <div
              key={a.id}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-[15px] text-gray-800"
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">{a.filename}</span>
            </div>
          ))}

          {extraVideos.map((a) => (
            <div key={a.id} className="mt-3 overflow-hidden rounded-lg bg-black">
              <video src={a.url} className="aspect-video w-full object-cover" controls playsInline />
            </div>
          ))}

          {audios.map((a) => (
            <div
              key={a.id}
              className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <Music className="h-6 w-6 shrink-0 text-navy" />
              <span className="text-[15px] font-medium text-gray-800">{a.filename}</span>
            </div>
          ))}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {entry.status === "DRAFT" ?
              <Badge className="bg-amber-100 text-amber-900">Draft</Badge>
            : entry.status === "PUBLISHED" ?
              <Badge className="bg-green-100 text-green-900">Published</Badge>
            : <Badge className="bg-blue-100 text-blue-900">
                <Clock className="mr-1 inline h-4 w-4" />
                Scheduled
              </Badge>
            }
          </div>
        </div>
      </div>
    </article>
  );
}
