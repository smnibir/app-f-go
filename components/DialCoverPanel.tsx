"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { postFormDataWithProgress } from "@/lib/upload-xhr";

type Props = {
  initial: {
    url: string | null;
    posX: number;
    posY: number;
    zoom: number;
  };
};

export function DialCoverPanel({ initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
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

  async function onPickFile(file: File) {
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
      toast({ title: "Background updated" });
      router.refresh();
    } finally {
      setBusy(false);
      setPct(0);
    }
  }

  async function onRemove() {
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
      toast({ title: "Background removed" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 w-full max-w-[min(100vw-2rem,520px)] rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
      <p className="mb-3 text-sm font-semibold text-gray-800">Dial background</p>
      <p className="mb-3 text-xs text-gray-500">
        Upload a cover photo, then adjust position and zoom. Changes save automatically.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-navy transition hover:bg-gray-100">
          {busy ?
            <Loader2 className="h-4 w-4 animate-spin" />
          : <ImageIcon className="h-4 w-4" />}
          {busy ? `Uploading… ${pct}%` : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onPickFile(f);
            }}
          />
        </label>
        {url ?
          <button
            type="button"
            onClick={() => void onRemove()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        : null}
      </div>
      {url ?
        <div className="mt-4 space-y-3">
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
      : null}
    </div>
  );
}
