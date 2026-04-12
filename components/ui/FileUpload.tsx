"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Music, Video, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF";
  size?: number;
  progress?: number;
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

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || disabled) return;
      setBusy(true);
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append("file", file);
        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.open("POST", "/api/upload");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              // parent could track by temp id — simplified: skip granular
            }
          };
          xhr.onload = () => {
            try {
              const res = JSON.parse(xhr.responseText) as Omit<UploadedFile, "id"> & {
                error?: string;
              };
              if (xhr.status >= 400) throw new Error(res.error || "Upload failed");
              onAdd({
                id: res.publicId,
                url: res.url,
                publicId: res.publicId,
                type: res.type,
                filename: res.filename,
                size: res.size,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(fd);
        });
      }
      setBusy(false);
    },
    [disabled, onAdd]
  );

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
          disabled && "opacity-50"
        )}
      >
        <Upload className="mb-2 h-10 w-10 text-navy" aria-hidden />
        <span className="text-base font-medium text-navy">Drag files here or tap to browse</span>
        <span className="mt-1 text-[15px] text-gray-500">JPG, PNG, MP4, MP3, PDF — max 50MB</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </button>
      <ul className="mt-4 space-y-3">
        {files.map((f) => (
          <li
            key={f.publicId}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
          >
            <FileIcon type={f.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-gray-900">{f.filename}</p>
              {f.progress !== undefined && f.progress < 100 ?
                <div className="mt-1 h-2 w-full rounded bg-gray-100">
                  <div
                    className="h-2 rounded bg-navy transition-all"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              : null}
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
