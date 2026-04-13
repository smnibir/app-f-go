"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { format, isAfter } from "date-fns";
import { Clock, Pencil, FileText, Music, Play } from "lucide-react";
import type { Asset, TimelineEntry } from "@prisma/client";
import { MediaLightbox } from "@/components/timeline/MediaLightbox";
import { cn } from "@/lib/utils";

type Entry = TimelineEntry & { assets: Asset[] };

const TITLE_ACTIVE = "text-[#0056b3]";
const TITLE_INACTIVE = "text-[#878787]";
const DESC_INACTIVE = "text-[#494949]";
const DATE_INACTIVE = "text-[#939393]";
const UPLOAD_META_INACTIVE = "text-[#939393]";

function entryStatusLabel(status: Entry["status"]): string {
  if (status === "DRAFT") return "Draft";
  if (status === "PUBLISHED") return "Published";
  return "Scheduled";
}

function buildLightboxAssets(
  thumbImage: Asset | null,
  thumbVideo: Asset | null,
  extraImages: Asset[],
  pdfs: Asset[],
  extraVideos: Asset[],
  audios: Asset[]
): Asset[] {
  const row: Asset[] = [];
  if (thumbImage) row.push(thumbImage);
  else if (thumbVideo) row.push(thumbVideo);
  row.push(...extraImages, ...pdfs, ...extraVideos, ...audios);
  return row.filter((a) => ["IMAGE", "VIDEO", "AUDIO", "PDF"].includes(a.type));
}

export function TimelineCard({
  entry,
  editHref,
  now = new Date(),
  className,
  uploadedMetaAlign = "left",
  isActive = false,
}: {
  entry: Entry;
  editHref: string;
  now?: Date;
  className?: string;
  uploadedMetaAlign?: "left" | "right";
  /** True when this card is nearest viewport center while scrolling */
  isActive?: boolean;
}) {
  const d = entry.entryDate;
  const scheduledFuture = Boolean(
    entry.status === "SCHEDULED" && entry.publishAt && isAfter(entry.publishAt, now)
  );

  const images = entry.assets.filter((a) => a.type === "IMAGE");
  const videos = entry.assets.filter((a) => a.type === "VIDEO");
  const audios = entry.assets.filter((a) => a.type === "AUDIO");
  const pdfs = entry.assets.filter((a) => a.type === "PDF");

  const thumbImage = images[0];
  const thumbVideo = !thumbImage && videos[0] ? videos[0] : null;
  const extraImages = thumbImage ? images.slice(1) : images;
  const extraVideos = thumbVideo ? videos.slice(1) : videos;

  const showThumbColumn = !!(thumbImage || thumbVideo);

  const lightboxAssets = useMemo(() => {
    const img = entry.assets.filter((a) => a.type === "IMAGE");
    const vid = entry.assets.filter((a) => a.type === "VIDEO");
    const aud = entry.assets.filter((a) => a.type === "AUDIO");
    const pdf = entry.assets.filter((a) => a.type === "PDF");
    const ti = img[0];
    const tv = !ti && vid[0] ? vid[0] : null;
    const ei = ti ? img.slice(1) : img;
    const ev = tv ? vid.slice(1) : vid;
    return buildLightboxAssets(ti ?? null, tv ?? null, ei, pdf, ev, aud);
  }, [entry.assets]);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  function openAsset(asset: Asset) {
    const i = lightboxAssets.findIndex((a) => a.id === asset.id);
    if (i < 0) return;
    setLbIndex(i);
    setLbOpen(true);
  }

  return (
    <div className={cn("w-full", className)}>
      <p
        className={cn(
          "mb-2 text-[15px]",
          isActive ? "text-[#0056b3]" : UPLOAD_META_INACTIVE,
          uploadedMetaAlign === "right" && "md:text-right"
        )}
      >
        Uploaded on: {format(entry.updatedAt, "d MMM yyyy")}
        <span className={cn("font-medium", isActive ? "text-[#0056b3]" : "text-gray-600")}>
          {" "}
          · {entryStatusLabel(entry.status)}
        </span>
      </p>

      <article
        className={cn(
          "relative w-full rounded-2xl border p-5 motion-safe:transition motion-safe:duration-300 md:p-6",
          isActive ?
            "border-[#b3d9f2] bg-[#f0f7ff] shadow-md motion-safe:hover:shadow-lg"
          : "border-gray-200/90 bg-white shadow-lg motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl",
          scheduledFuture && !isActive && "bg-surface/90"
        )}
      >
        {showThumbColumn ?
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
              type="button"
              className="group relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 text-left sm:h-40 sm:w-40"
              onClick={() => openAsset((thumbImage || thumbVideo)!)}
            >
              {thumbImage ?
                <Image
                  src={thumbImage.url}
                  alt=""
                  fill
                  className="object-cover transition group-hover:opacity-95"
                  unoptimized
                />
              : thumbVideo ?
                <>
                  <video
                    src={thumbVideo.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#0056b3] shadow">
                      <Play className="h-6 w-6 fill-current" />
                    </span>
                  </span>
                </>
              : null}
            </button>

            <CardBody
              entry={entry}
              d={d}
              editHref={editHref}
              scheduledFuture={scheduledFuture}
              extraImages={extraImages}
              extraVideos={extraVideos}
              pdfs={pdfs}
              audios={audios}
              isActive={isActive}
              onOpenAsset={openAsset}
            />
          </div>
        : <CardBody
            entry={entry}
            d={d}
            editHref={editHref}
            scheduledFuture={scheduledFuture}
            extraImages={extraImages}
            extraVideos={extraVideos}
            pdfs={pdfs}
            audios={audios}
            isActive={isActive}
            onOpenAsset={openAsset}
          />
        }
      </article>

      {lightboxAssets.length > 0 ?
        <MediaLightbox
          open={lbOpen}
          onOpenChange={setLbOpen}
          assets={lightboxAssets}
          initialIndex={lbIndex}
        />
      : null}
    </div>
  );
}

function CardBody({
  entry,
  d,
  editHref,
  scheduledFuture,
  extraImages,
  extraVideos,
  pdfs,
  audios,
  isActive,
  onOpenAsset,
}: {
  entry: Entry;
  d: Date;
  editHref: string;
  scheduledFuture: boolean;
  extraImages: Asset[];
  extraVideos: Asset[];
  pdfs: Asset[];
  audios: Asset[];
  isActive: boolean;
  onOpenAsset: (asset: Asset) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Link
        href={editHref}
        className={cn(
          "absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-md transition motion-safe:duration-200",
          "bg-white/95 backdrop-blur-sm hover:scale-[1.04] hover:shadow-lg active:scale-[0.98]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0056b3]",
          isActive ?
            "border-[#b3d9f2] text-[#0056b3] shadow-[0_4px_16px_rgba(0,86,179,0.12)]"
          : "border-gray-200/90 text-navy hover:border-gray-300"
        )}
        aria-label="Edit timeline event"
      >
        <Pencil className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </Link>

      <div className="pr-14">
        <p className={cn("mb-2 text-[15px]", isActive ? "text-[#0056b3]" : DATE_INACTIVE)}>
          {format(d, "d MMM yyyy")}
        </p>
        <h2 className={cn("text-xl font-bold leading-snug", isActive ? TITLE_ACTIVE : TITLE_INACTIVE)}>
          {entry.title}
        </h2>
        {entry.description ?
          <p
            className={cn(
              "mt-2 text-base leading-relaxed",
              isActive ? "text-gray-800" : DESC_INACTIVE
            )}
          >
            {entry.description}
          </p>
        : null}

        {scheduledFuture && entry.publishAt ?
          <p className={cn("mt-2 text-[15px]", isActive ? "text-gray-700" : "text-[#494949]")}>
            <Clock className="mr-1 inline h-4 w-4 text-[#0056b3]" />
            Appears {format(entry.publishAt, "d MMMM yyyy 'at' HH:mm")}
          </p>
        : null}
      </div>

      {extraImages.length > 0 ?
        <div className="mt-3 grid grid-cols-3 gap-1">
          {extraImages.slice(0, 3).map((a) => (
            <button
              key={a.id}
              type="button"
              className="relative aspect-square overflow-hidden rounded-md bg-gray-100 text-left outline-none ring-[#0056b3] ring-offset-2 hover:opacity-95 focus-visible:ring-2"
              onClick={() => onOpenAsset(a)}
            >
              <Image src={a.url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      : null}

      {pdfs.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpenAsset(a)}
          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-left text-[15px] text-gray-800 hover:bg-gray-200/90"
        >
          <FileText className="h-5 w-5 shrink-0" />
          <span className="truncate">{a.filename}</span>
        </button>
      ))}

      {extraVideos.map((a) => (
        <button
          key={a.id}
          type="button"
          className="group relative mt-3 w-full overflow-hidden rounded-lg bg-black text-left"
          onClick={() => onOpenAsset(a)}
        >
          <video
            src={a.url}
            className="aspect-video w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-80 transition group-hover:opacity-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#0056b3] shadow-lg">
              <Play className="h-7 w-7 fill-current" />
            </span>
          </span>
        </button>
      ))}

      {audios.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpenAsset(a)}
          className="mt-3 flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
        >
          <Music className="h-6 w-6 shrink-0 text-[#0056b3]" />
          <span className="text-[15px] font-medium text-gray-800">{a.filename}</span>
        </button>
      ))}
    </div>
  );
}
