"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, Trash2, X } from "lucide-react";
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
  setPosX: Dispatch<SetStateAction<number>>;
  setPosY: Dispatch<SetStateAction<number>>;
  setZoom: Dispatch<SetStateAction<number>>;
  url: string | null;
  busy: boolean;
  pct: number;
  openFilePicker: () => void;
  onRemove: () => void;
  /** True while positioning cover full-screen (dial hidden). */
  coverEditMode: boolean;
  enterCoverEdit: () => void;
  saveCoverEdit: () => Promise<void>;
  cancelCoverEdit: () => void;
  savingCover: boolean;
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
  const [coverEditMode, setCoverEditMode] = useState(false);
  const [savingCover, setSavingCover] = useState(false);

  const lastSaved = useRef({
    posX: initial.posX,
    posY: initial.posY,
    zoom: initial.zoom,
    url: initial.url,
  });

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
      setCoverEditMode(false);
    }
  }, [initial.url, initial.posX, initial.posY, initial.zoom]);

  const savePosNow = useCallback(
    async (next: { posX: number; posY: number; zoom: number }) => {
      const body = {
        dialCoverPosX: Math.round(Math.min(100, Math.max(0, next.posX))),
        dialCoverPosY: Math.round(Math.min(100, Math.max(0, next.posY))),
        dialCoverZoom: Math.round(Math.min(200, Math.max(50, next.zoom))),
      };
      const res = await fetch("/api/user/dial-cover", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string" ? data.error
          : res.status === 400 ? "Invalid request"
          : "Save failed";
        throw new Error(msg);
      }
      lastSaved.current = {
        posX: body.dialCoverPosX,
        posY: body.dialCoverPosY,
        zoom: body.dialCoverZoom,
        url,
      };
      setPosX(body.dialCoverPosX);
      setPosY(body.dialCoverPosY);
      setZoom(body.dialCoverZoom);
      router.refresh();
    },
    [router, url]
  );

  const enterCoverEdit = useCallback(() => {
    if (!url) return;
    setCoverEditMode(true);
  }, [url]);

  const cancelCoverEdit = useCallback(() => {
    const s = lastSaved.current;
    setPosX(s.posX);
    setPosY(s.posY);
    setZoom(s.zoom);
    setCoverEditMode(false);
  }, []);

  const saveCoverEdit = useCallback(async () => {
    if (!url) return;
    setSavingCover(true);
    try {
      await savePosNow({ posX, posY, zoom });
      setCoverEditMode(false);
      toast({ title: "Background saved" });
    } catch (e) {
      toast({
        title: "Could not save dial background",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCover(false);
    }
  }, [posX, posY, zoom, url, savePosNow, toast]);

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
        const px = Math.round(Math.min(100, Math.max(0, posX)));
        const py = Math.round(Math.min(100, Math.max(0, posY)));
        const z = Math.round(Math.min(200, Math.max(50, zoom)));
        const patch = await fetch("/api/user/dial-cover", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dialCoverUrl: payload.url,
            dialCoverPublicId: payload.publicId,
            dialCoverPosX: px,
            dialCoverPosY: py,
            dialCoverZoom: z,
          }),
        });
        if (!patch.ok) {
          const err = await patch.json().catch(() => ({}));
          toast({
            title: "Could not save",
            description: typeof err.error === "string" ? err.error : "Try again.",
            variant: "destructive",
          });
          return;
        }
        setUrl(payload.url);
        lastSaved.current = { posX: px, posY: py, zoom: z, url: payload.url };
        setPosX(px);
        setPosY(py);
        setZoom(z);
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
      setCoverEditMode(false);
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
    coverEditMode,
    enterCoverEdit,
    saveCoverEdit,
    cancelCoverEdit,
    savingCover,
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

/** Full-viewport cover; drag/wheel only while `editing` is true. */
export function DashboardCoverBackground({ editing }: { editing: boolean }) {
  const { url, posX, posY, zoom, setPosX, setPosY, setZoom } = useDialCover();
  const drag = useRef<{ lastX: number; lastY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!url) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-0 overflow-hidden bg-gray-200 transition-opacity",
        editing ? "pointer-events-auto" : "pointer-events-none"
      )}
      style={{ touchAction: editing ? "none" : "auto" }}
      onPointerDown={(e) => {
        if (!editing || e.button !== 0) return;
        drag.current = { lastX: e.clientX, lastY: e.clientY };
        try {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onPointerMove={(e) => {
        if (!editing || !drag.current || !containerRef.current) return;
        const dx = e.clientX - drag.current.lastX;
        const dy = e.clientY - drag.current.lastY;
        drag.current.lastX = e.clientX;
        drag.current.lastY = e.clientY;
        const w = containerRef.current.clientWidth || 1;
        const h = containerRef.current.clientHeight || 1;
        setPosX((x) => Math.min(100, Math.max(0, x - (dx / w) * 140)));
        setPosY((y) => Math.min(100, Math.max(0, y - (dy / h) * 140)));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onWheel={(e) => {
        if (!editing) return;
        e.preventDefault();
        const delta = -e.deltaY * 0.12;
        setZoom((z) => Math.min(200, Math.max(50, Math.round(z + delta))));
      }}
    >
      <div
        className="h-full w-full will-change-transform"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: `${posX}% ${posY}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover select-none"
          style={{ objectPosition: `${posX}% ${posY}%` }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/** Fixed bar while editing cover (Save / Cancel). */
export function CoverEditToolbar() {
  const { saveCoverEdit, cancelCoverEdit, savingCover, openFilePicker, busy, pct, url } =
    useDialCover();

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[50] border-t border-gray-200/80 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-gray-600 sm:text-left">
          <span className="font-medium text-gray-900">Position your background</span>
          <span className="hidden sm:inline"> — </span>
          <span className="block sm:inline">Drag to pan, scroll to zoom.</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={busy || savingCover}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ?
              <Loader2 className="h-4 w-4 animate-spin" />
            : <ImagePlus className="h-4 w-4" />}
            {busy ? `${pct}%` : url ? "Change photo" : "Add photo"}
          </button>
          <button
            type="button"
            onClick={cancelCoverEdit}
            disabled={savingCover}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveCoverEdit()}
            disabled={savingCover}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0056b3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#004a9c] disabled:opacity-60"
          >
            {savingCover ?
              <Loader2 className="h-4 w-4 animate-spin" />
            : <Check className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** Upload / change cover when not in edit mode. */
export function DialCoverCornerFab({ side = "right" }: { side?: "left" | "right" }) {
  const { busy, pct, openFilePicker, url, coverEditMode } = useDialCover();
  const label = url ? "Change cover" : "Upload cover";

  if (coverEditMode) return null;

  return (
    <button
      type="button"
      onClick={openFilePicker}
      disabled={busy}
      title={label}
      aria-label={busy ? `Uploading, ${pct}%` : label}
      className={cn(
        "fixed z-[45] flex max-w-[min(calc(100vw-1.5rem),280px)] items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white/95 px-2 py-1.5 text-left shadow-md backdrop-blur-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0056b3] focus-visible:ring-offset-2 disabled:opacity-60 sm:gap-2 sm:px-2.5 sm:py-2",
        side === "right" ? "bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
        : "bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))]"
      )}
    >
      {busy ?
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0056b3]" />
      : <ImagePlus className="h-4 w-4 shrink-0 text-[#0056b3]" strokeWidth={2} />}
      <span className="hidden min-w-0 truncate text-[11px] font-semibold leading-tight text-gray-900 sm:inline sm:text-xs">
        {busy ? `Uploading… ${pct}%` : label}
      </span>
    </button>
  );
}

/** CTA to enter cover edit mode or hint to upload. */
export function DialCoverDashboardHint() {
  const { url, enterCoverEdit } = useDialCover();

  return (
    <div className="pointer-events-auto mt-5 w-full max-w-[min(100vw,520px)] px-2">
      {url ?
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button
            type="button"
            onClick={enterCoverEdit}
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0056b3] shadow-md ring-1 ring-black/[0.08] backdrop-blur-sm transition hover:bg-white"
          >
            Adjust background
          </button>
          <p className="text-center text-xs text-gray-600">
            Hide the dial, position the full-screen photo, then save.
          </p>
        </div>
      : <p className="text-center text-xs text-gray-500">
          Use <span className="font-medium text-gray-700">Upload cover</span> (corner) or{" "}
          <span className="font-medium text-gray-700">Add cover</span> in Settings.
        </p>}
    </div>
  );
}

/** Settings: polished background section. */
export function DialCoverSettingsCard() {
  const { url, busy, pct, openFilePicker, onRemove } = useDialCover();

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-br from-slate-50 to-gray-100 shadow-sm">
      <div className="border-b border-gray-200/80 bg-white/60 px-5 py-4 backdrop-blur-sm">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900">Background</h3>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
          Full-screen photo behind the dashboard. Open <span className="font-medium text-gray-800">Adjust background</span>{" "}
          on the home screen to drag, zoom, and save — or manage the image here.
        </p>
      </div>

      <div className="p-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-gray-200/80 bg-gray-200 shadow-inner",
            "aspect-[21/9] min-h-[120px] w-full sm:aspect-[24/9]"
          )}
        >
          {url ?
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
                <p className="text-xs font-medium text-white/95 drop-shadow-sm sm:text-sm">Your dashboard background</p>
                <Link
                  href="/dashboard?adjustCover=1"
                  className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-md backdrop-blur-sm transition hover:bg-white sm:px-4 sm:text-sm"
                >
                  Adjust on dashboard
                </Link>
              </div>
            </>
          : <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="rounded-full bg-white/80 p-3 shadow-sm ring-1 ring-gray-200/80">
                <ImagePlus className="h-8 w-8 text-[#0056b3]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-700">No background yet</p>
              <p className="max-w-xs text-xs text-gray-500">
                Add a photo for a full-screen look behind your dial.
              </p>
            </div>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0056b3] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004a9c] disabled:opacity-60 sm:flex-none sm:px-6"
          >
            {busy ?
              <Loader2 className="h-4 w-4 animate-spin" />
            : <ImagePlus className="h-4 w-4" strokeWidth={2} />}
            {busy ? `Uploading… ${pct}%` : url ? "Replace image" : "Add background"}
          </button>
          {url ?
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-800 shadow-sm hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          : null}
        </div>
      </div>
    </div>
  );
}
