"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Asset } from "@prisma/client";
import { cn } from "@/lib/utils";

function pdfDownloadFilename(stored: string | null): string {
  const t = stored?.trim();
  if (!t) return "document.pdf";
  return /\.[a-z0-9]{2,8}$/i.test(t) ? t : `${t}.pdf`;
}

async function downloadPdfFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

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

            {current.type === "IMAGE" ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt=""
                className="max-h-[min(78vh,820px)] max-w-full object-contain"
              />
            : current.type === "VIDEO" ?
              <video
                key={current.id}
                src={current.url}
                controls
                playsInline
                className="max-h-[min(78vh,820px)] w-full max-w-full rounded-lg"
                preload="metadata"
              />
            : current.type === "AUDIO" ?
              <div className="flex w-full max-w-md flex-col items-center gap-4 p-8">
                <p className="text-center text-sm text-white/70">Audio</p>
                <audio key={current.id} src={current.url} controls className="w-full" preload="metadata" />
              </div>
            : (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <p className="text-white/80">PDF document</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#0056b3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#004a9c]"
                  >
                    Open PDF in new tab
                  </a>
                  <button
                    type="button"
                    className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
                    onClick={() =>
                      void downloadPdfFromUrl(current.url, pdfDownloadFilename(current.filename))
                    }
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
