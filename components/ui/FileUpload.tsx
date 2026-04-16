"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Music, Video, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadTimelineFileDirect } from "@/lib/upload-cloudinary-direct";

export type UploadedFile = {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF";
  size?: number;
  progress?: number;
};

type QueuedUpload = {
  id: string;
  filename: string;
  progress: number;
  error?: string;
};

type Props = {
  files: UploadedFile[];
  onAdd: (f: UploadedFile) => void;
  onRemove: (publicId: string) => void;
  accept?: string;
  disabled?: boolean;
};

export function FileUpload({ files, onAdd, onRemove, accept, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<QueuedUpload[]>([]);

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || disabled) return;
      const fileArr = Array.from(list);
      setBusy(true);

      await Promise.all(
        fileArr.map(async (file) => {
          const id = crypto.randomUUID();
          setUploading((q) => [...q, { id, filename: file.name, progress: 0 }]);

          try {
            const result = await uploadTimelineFileDirect(file, (pct) => {
              setUploading((q) => q.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
            });
            if (!result.ok) {
              setUploading((q) =>
                q.map((u) => (u.id === id ? { ...u, progress: 0, error: result.error } : u))
              );
              return;
            }
            const res = result.data;
            onAdd({
              id: res.publicId,
              url: res.url,
              publicId: res.publicId,
              type: res.type,
              filename: res.filename,
              size: res.size,
            });
            setUploading((q) => q.filter((u) => u.id !== id));
          } catch {
            setUploading((q) =>
              q.map((u) => (u.id === id ? { ...u, progress: 0, error: "Network error" } : u))
            );
          }
        })
      );

      setBusy(false);
    },
    [disabled, onAdd]
  );

  const dismissFailed = (id: string) => {
    setUploading((q) => q.filter((u) => u.id !== id));
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[160px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-8 text-center transition",
          drag && "border-accent bg-gray-50",
          (disabled || busy) && "opacity-70"
        )}
      >
        {busy ?
          <>
            <Loader2 className="mb-2 h-10 w-10 animate-spin text-navy" aria-hidden />
            <span className="text-base font-medium text-navy">Uploading…</span>
            <span className="mt-1 text-[15px] text-gray-500">You can keep this page open</span>
          </>
        : <>
            <Upload className="mb-2 h-10 w-10 text-navy" aria-hidden />
            <span className="text-base font-medium text-navy">Drag files here or tap to browse</span>
            <span className="mt-1 text-[15px] text-gray-500">JPG, PNG, MP4, MP3, PDF — max 50MB</span>
          </>
        }
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </button>

      {uploading.length > 0 ?
        <ul className="mt-4 space-y-3" aria-live="polite">
          {uploading.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-[#b3d9f2] bg-[#f0f7ff] p-3"
            >
              <Loader2 className="h-6 w-6 shrink-0 animate-spin text-[#0056b3]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-gray-900">{u.filename}</p>
                {u.error ?
                  <p className="mt-1 text-sm text-red-600">{u.error}</p>
                : <>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#0056b3] transition-[width] duration-150"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{u.progress}% uploaded</p>
                  </>
                }
              </div>
              {u.error ?
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/80"
                  onClick={() => dismissFailed(u.id)}
                >
                  Dismiss
                </button>
              : null}
            </li>
          ))}
        </ul>
      : null}

      <ul className="mt-4 space-y-3">
        {files.map((f) => (
          <li
            key={f.publicId}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
          >
            <FileIcon type={f.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-gray-900">{f.filename}</p>
            </div>
            <button
              type="button"
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
              aria-label="Remove file"
              onClick={() => onRemove(f.publicId)}
            >
              <X className="h-6 w-6" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileIcon({ type }: { type: UploadedFile["type"] }) {
  switch (type) {
    case "IMAGE":
      return <ImageIcon className="h-8 w-8 shrink-0 text-navy" />;
    case "VIDEO":
      return <Video className="h-8 w-8 shrink-0 text-navy" />;
    case "AUDIO":
      return <Music className="h-8 w-8 shrink-0 text-navy" />;
    default:
      return <FileText className="h-8 w-8 shrink-0 text-navy" />;
  }
}
