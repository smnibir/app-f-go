"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import type { Asset } from "@prisma/client";
import { cn } from "@/lib/utils";

type MediaAsset = Asset & { type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF" };

function isMedia(a: Asset): a is MediaAsset {
  return a.type === "IMAGE" || a.type === "VIDEO" || a.type === "AUDIO" || a.type === "PDF";
}

export function MediaLightbox({
  open,
  onOpenChange,
  assets,
  initialIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  initialIndex: number;
}) {
  const list = assets.filter(isMedia);
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    if (!open) return;
    const safe = Math.max(0, Math.min(initialIndex, Math.max(0, list.length - 1)));
    setIdx(safe);
  }, [open, initialIndex, list.length]);

  const current = list[idx];
  const hasNav = list.length > 1;

  const [deliveryUrl, setDeliveryUrl] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !current) return;
    /** PDFs open via same-origin `/api/media/pdf` (streams Cloudinary) — avoids Chrome frame errors on raw URLs. */
    if (current.type === "PDF") {
      setDeliveryError(null);
      setDeliveryUrl(null);
      return;
    }
    const needsSigned = current.url.includes("res.cloudinary.com");
    if (!needsSigned) {
      setDeliveryUrl(null);
      setDeliveryError(null);
      return;
    }
    let cancelled = false;
    setDeliveryUrl(null);
    setDeliveryError(null);
    (async () => {
      try {
        const r = await fetch(
          `/api/media/delivery?assetId=${encodeURIComponent(current.id)}`
        );
        const data: { url?: string; error?: string } = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(data.error || "Could not load media");
        if (!data.url) throw new Error("Missing URL");
        setDeliveryUrl(data.url);
      } catch (e) {
        if (!cancelled) {
          setDeliveryError(e instanceof Error ? e.message : "Could not load media");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, current?.id, current?.url, current?.type]);

  function go(delta: number) {
    setIdx((i) => (i + delta + list.length) % list.length);
  }

  useEffect(() => {
    if (!open || list.length <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setIdx((i) => (i - 1 + list.length) % list.length);
      }
      if (e.key === "ArrowRight") {
        setIdx((i) => (i + 1) % list.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.length]);

  if (!current) return null;

  const isCloudinary = current.url.includes("res.cloudinary.com");
  const pdfOpenHref =
    current.type === "PDF" && isCloudinary ?
      `/api/media/pdf?assetId=${encodeURIComponent(current.id)}`
    : current.type === "PDF" ? current.url
    : "";

  const mediaSrc =
    current.type === "PDF" ? null
    : isCloudinary ? deliveryUrl
    : current.url;

  const loadingCloudinaryMedia =
    current.type !== "PDF" && isCloudinary && deliveryUrl === null && !deliveryError;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/92 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[80] flex max-h-[min(96vh,900px)] w-[min(96vw,1200px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-3 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out"
          )}
          aria-describedby={undefined}
        >
          <div className="mb-2 flex min-h-[44px] items-center justify-between gap-3 px-1">
            <Dialog.Title className="min-w-0 truncate text-sm font-medium text-white/90 md:text-base">
              {current.filename || "Media"}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-2">
              {hasNav ?
                <span className="hidden text-xs text-white/50 sm:inline">
                  {idx + 1} / {list.length}
                </span>
              : null}
              <Dialog.Close
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
            {hasNav ?
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 md:left-3 md:h-14 md:w-14"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 md:right-3 md:h-14 md:w-14"
                  aria-label="Next"
                >
                  <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
                </button>
              </>
            : null}

            {deliveryError ?
              <p className="px-4 text-center text-sm text-red-400">{deliveryError}</p>
            : loadingCloudinaryMedia ?
              <p className="text-sm text-white/60">Loading…</p>
            : current.type === "IMAGE" ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.id}
                src={mediaSrc!}
                alt=""
                className="max-h-[min(78vh,820px)] max-w-full object-contain"
              />
            : current.type === "VIDEO" ?
              <video
                key={current.id}
                src={mediaSrc!}
                controls
                playsInline
                className="max-h-[min(78vh,820px)] w-full max-w-full rounded-lg"
                preload="metadata"
              />
            : current.type === "AUDIO" ?
              <div className="flex w-full max-w-md flex-col items-center gap-4 p-8">
                <p className="text-center text-sm text-white/70">Audio</p>
                <audio key={current.id} src={mediaSrc!} controls className="w-full" preload="metadata" />
              </div>
            : (
              <div
                key={current.id}
                className="flex h-[min(78vh,820px)] w-full min-h-[280px] flex-1 flex-col items-center justify-center gap-4 px-6 py-12"
              >
                <svg
                  className="h-16 w-16 shrink-0 text-red-500/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                    fill="currentColor"
                    fillOpacity="0.15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 2v6h6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 17.5h5M9.5 14.5h5M9.5 11.5h2.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="max-w-[min(90vw,480px)] truncate text-center text-sm font-medium text-white/90">
                  {current.filename || "PDF"}
                </p>
                <a
                  href={pdfOpenHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Open PDF
                </a>
                <p className="text-xs text-white/50">Opens in a new tab</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
