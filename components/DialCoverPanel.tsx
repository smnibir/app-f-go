"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { postFormDataWithProgress } from "@/lib/upload-xhr";
import { cn } from "@/lib/utils";

export type DialCoverInitial = {
  url: string | null;
  posX: number;
  posY: number;
  zoom: number;
};

type Ctx = {
  posX: number;
  posY: number;
  zoom: number;
  setPosX: (n: number) => void;
  setPosY: (n: number) => void;
  setZoom: (n: number) => void;
  url: string | null;
  busy: boolean;
  pct: number;
  openFilePicker: () => void;
  onRemove: () => void;
};

const DialCoverCtx = createContext<Ctx | null>(null);

export function useDialCover() {
  const v = useContext(DialCoverCtx);
  if (!v) throw new Error("useDialCover must be used within DialCoverProvider");
  return v;
}

export function DialCoverProvider({
  initial,
  children,
}: {
  initial: DialCoverInitial;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [posX, setPosX] = useState(initial.posX);
  const [posY, setPosY] = useState(initial.posY);
  const [zoom, setZoom] = useState(initial.zoom);
  const [url, setUrl] = useState(initial.url);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const lastSaved = useRef({
    posX: initial.posX,
    posY: initial.posY,
    zoom: initial.zoom,
    url: initial.url,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial.url !== lastSaved.current.url) {
      lastSaved.current = {
        posX: initial.posX,
        posY: initial.posY,
        zoom: initial.zoom,
        url: initial.url,
      };
      setPosX(initial.posX);
      setPosY(initial.posY);
      setZoom(initial.zoom);
      setUrl(initial.url);
    }
  }, [initial.url, initial.posX, initial.posY, initial.zoom]);

  const savePos = useCallback(
    async (next: { posX: number; posY: number; zoom: number }) => {
      try {
        const res = await fetch("/api/user/dial-cover", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dialCoverPosX: next.posX,
            dialCoverPosY: next.posY,
            dialCoverZoom: next.zoom,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(typeof data.error === "string" ? data.error : "Save failed");
        }
        lastSaved.current = { ...next, url };
        router.refresh();
      } catch (e) {
        toast({
          title: "Could not save dial background",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      }
    },
    [router, toast, url]
  );

  useEffect(() => {
    if (!url) return;
    if (
      posX === lastSaved.current.posX &&
      posY === lastSaved.current.posY &&
      zoom === lastSaved.current.zoom
    ) {
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void savePos({ posX, posY, zoom });
    }, 450);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [posX, posY, zoom, url, savePos]);

  const onPickFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setPct(0);
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("purpose", "dial-cover");
        const { ok, data } = await postFormDataWithProgress("/api/upload", fd, setPct);
        const payload = data as { error?: string; url?: string; publicId?: string };
        if (!ok || !payload.url || !payload.publicId) {
          toast({
            title: "Upload failed",
            description: payload.error || "Try again.",
            variant: "destructive",
          });
          return;
        }
        const patch = await fetch("/api/user/dial-cover", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dialCoverUrl: payload.url,
            dialCoverPublicId: payload.publicId,
            dialCoverPosX: posX,
            dialCoverPosY: posY,
            dialCoverZoom: zoom,
          }),
        });
        if (!patch.ok) {
          toast({ title: "Could not save", description: "Try again.", variant: "destructive" });
          return;
        }
        setUrl(payload.url);
        lastSaved.current = { posX, posY, zoom, url: payload.url };
        toast({ title: "Cover updated" });
        router.refresh();
      } finally {
        setBusy(false);
        setPct(0);
      }
    },
    [posX, posY, zoom, router, toast]
  );

  const onRemove = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/dial-cover", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        toast({ title: "Could not remove", variant: "destructive" });
        return;
      }
      setUrl(null);
      setPosX(50);
      setPosY(50);
      setZoom(100);
      lastSaved.current = { posX: 50, posY: 50, zoom: 100, url: null };
      toast({ title: "Cover removed" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [router, toast]);

  const openFilePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) void onPickFile(f);
    },
    [onPickFile]
  );

  const ctx: Ctx = {
    posX,
    posY,
    zoom,
    setPosX,
    setPosY,
    setZoom,
    url,
    busy,
    pct,
    openFilePicker,
    onRemove,
  };

  return (
    <DialCoverCtx.Provider value={ctx}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        onChange={onInputChange}
        aria-hidden
      />
      {children}
    </DialCoverCtx.Provider>
  );
}

/** Facebook-style corner control on the dial (icon + “Upload cover”). */
export function DialCoverCornerFab({ side = "right" }: { side?: "left" | "right" }) {
  const { busy, pct, openFilePicker, url } = useDialCover();
  const label = url ? "Change cover" : "Upload cover";

  return (
    <button
      type="button"
      onClick={openFilePicker}
      disabled={busy}
      title={label}
      aria-label={busy ? `Uploading, ${pct}%` : label}
      className={cn(
        "absolute z-[5] flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white/95 px-2 py-1.5 text-left shadow-md backdrop-blur-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0056b3] focus-visible:ring-offset-2 disabled:opacity-60 sm:gap-2 sm:px-2.5 sm:py-2",
        side === "right" ? "bottom-3 right-3" : "bottom-3 left-3"
      )}
    >
      {busy ?
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0056b3]" />
      : <ImagePlus className="h-4 w-4 shrink-0 text-[#0056b3]" strokeWidth={2} />}
      <span className="hidden min-w-0 truncate text-[11px] font-semibold leading-tight text-gray-900 sm:inline sm:text-xs">
        {busy ? `Uploading… ${pct}%` : label}
      </span>
      {/* Mobile: icon-only still opens picker; label exposed via aria-label / title */}
    </button>
  );
}

function PositionSliders({ className }: { className?: string }) {
  const { posX, posY, zoom, setPosX, setPosY, setZoom } = useDialCover();

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-xs font-medium text-gray-600">
        Horizontal focus ({posX}%)
        <input
          type="range"
          min={0}
          max={100}
          value={posX}
          onChange={(e) => setPosX(Number(e.target.value))}
          className="mt-1 w-full accent-[#0056b3]"
        />
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Vertical focus ({posY}%)
        <input
          type="range"
          min={0}
          max={100}
          value={posY}
          onChange={(e) => setPosY(Number(e.target.value))}
          className="mt-1 w-full accent-[#0056b3]"
        />
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Zoom ({zoom}%)
        <input
          type="range"
          min={50}
          max={200}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-1 w-full accent-[#0056b3]"
        />
      </label>
    </div>
  );
}

/** Sliders + hint below the dial (upload is on the dial corner). */
export function DialCoverDashboardSliders() {
  const { url } = useDialCover();

  return (
    <div className="mt-5 w-full max-w-[min(100vw-2rem,520px)]">
      {url ?
        <>
          <p className="mb-2 text-xs text-gray-500">
            Position and zoom save automatically. Use <span className="font-medium text-gray-700">Change cover</span> on
            the dial or <span className="font-medium text-gray-700">Add cover</span> in{" "}
            <span className="font-medium text-gray-700">Settings</span> to replace the image.
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold text-gray-800">Adjust cover</p>
            <PositionSliders />
          </div>
        </>
      : <p className="text-center text-xs text-gray-500">
          Use <span className="font-medium text-gray-700">Upload cover</span> on the dial, or{" "}
          <span className="font-medium text-gray-700">Add cover</span> in{" "}
          <span className="font-medium text-gray-700">Settings</span>, to add a background.
        </p>}
    </div>
  );
}

/** Settings column: Facebook-style “Add cover” + preview + sliders. */
export function DialCoverSettingsCard() {
  const { url, busy, pct, openFilePicker, onRemove } = useDialCover();

  return (
    <div className="mt-8 border-t border-gray-100 pt-8">
      <h3 className="text-base font-semibold text-gray-900">Dial cover</h3>
      <p className="mt-1 text-sm text-gray-600">
        Add a photo behind your dial — you can also use <span className="font-medium text-gray-800">Upload cover</span>{" "}
        on the dashboard dial. Position and zoom save automatically.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative aspect-square w-full max-w-[140px] shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-inner",
            url ? "" : "flex items-center justify-center"
          )}
        >
          {url ?
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </>
          : <ImagePlus className="h-10 w-10 text-gray-300" strokeWidth={1.25} />}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0056b3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004a9c] disabled:opacity-60"
            >
              {busy ?
                <Loader2 className="h-4 w-4 animate-spin" />
              : <ImagePlus className="h-4 w-4" strokeWidth={2} />}
              {busy ? `Uploading… ${pct}%` : url ? "Change cover" : "Add cover"}
            </button>
            {url ?
              <button
                type="button"
                onClick={() => void onRemove()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            : null}
          </div>

          {url ?
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="mb-3 text-xs font-medium text-gray-700">Position &amp; zoom</p>
              <PositionSliders />
            </div>
          : null}
        </div>
      </div>
    </div>
  );
}
