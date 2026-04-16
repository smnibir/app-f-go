"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { postFormDataWithProgress } from "@/lib/upload-xhr";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export type ProfileAvatarUser = {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  variant: "dial" | "settings";
  user: ProfileAvatarUser;
  /** Display name for avatar fallback (settings often uses edited name field) */
  displayName?: string | null;
  /** After DB + session sync */
  onAvatarSaved?: (next: { avatarUrl: string; avatarPublicId: string }) => void;
};

export function ProfileAvatarUpload({ variant, user, displayName, onAvatarSaved }: Props) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const sessionUrl = session?.user?.avatarUrl ?? undefined;
  /** Shown until PATCH + session.update() finishes so the new image appears immediately */
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingUrl) return;
    if (sessionUrl === pendingUrl || user.avatarUrl === pendingUrl) {
      setPendingUrl(null);
    }
  }, [pendingUrl, sessionUrl, user.avatarUrl]);

  const effectiveUrl = pendingUrl ?? sessionUrl ?? user.avatarUrl ?? undefined;
  const nameForAvatar = displayName ?? user.name;
  const email = user.email;

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setPct(0);
      setPendingUrl(null);
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("purpose", "avatar");
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
        const patch = await fetch("/api/user/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarUrl: payload.url, avatarPublicId: payload.publicId }),
        });
        const saved = (await patch.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          issues?: unknown;
          avatarUrl?: string;
          avatarPublicId?: string;
        };
        if (!patch.ok) {
          const desc =
            typeof saved.error === "string" ? saved.error
            : saved.issues ? JSON.stringify(saved.issues)
            : patch.statusText;
          toast({ title: "Could not save photo", description: desc, variant: "destructive" });
          return;
        }
        const nextUrl = saved.avatarUrl ?? payload.url;
        const nextPid = saved.avatarPublicId ?? payload.publicId;
        setPendingUrl(nextUrl);
        onAvatarSaved?.({ avatarUrl: nextUrl, avatarPublicId: nextPid });
        await update({ user: { avatarUrl: nextUrl } });
        router.refresh();
        if (variant === "settings") {
          toast({ title: "Photo updated" });
        }
      } finally {
        setBusy(false);
        setPct(0);
      }
    },
    [onAvatarSaved, router, toast, update, variant]
  );

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await upload(file);
  }

  const progressBlock = busy ?
    <div className={cn("w-full", variant === "dial" ? "max-w-[140px] px-1" : "max-w-[220px] px-2")}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-[#0056b3] transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-center text-xs text-gray-600">Uploading photo… {pct}%</p>
    </div>
  : null;

  if (variant === "dial") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="relative flex h-[128px] w-[128px] flex-col items-center justify-center gap-2 rounded-full bg-white shadow-sm outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#0056b3]/35 focus-visible:ring-offset-2 disabled:opacity-75"
          aria-label="Upload your photo"
        >
          {busy ?
            <div className="flex flex-col items-center justify-center gap-1 px-2">
              {effectiveUrl ?
                <div className="opacity-50">
                  <Avatar src={effectiveUrl} name={nameForAvatar} email={email} size={112} />
                </div>
              : <>
                  <Loader2 className="h-9 w-9 animate-spin text-[#0056b3]" aria-hidden />
                  <span className="text-center text-[12px] font-semibold text-[#0056b3]">Uploading…</span>
                </>
              }
            </div>
          : effectiveUrl ?
            <Avatar src={effectiveUrl} name={nameForAvatar} email={email} size={120} />
          : <>
              <Camera className="h-10 w-10 text-[#0056b3]" strokeWidth={1.5} />
              <span className="px-2 text-center text-[15px] font-semibold leading-snug text-[#0056b3]">
                Upload your photo
              </span>
            </>
          }
        </button>
        {busy ? progressBlock : null}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
      </div>
    );
  }

  /* settings */
  return (
    <div className="mb-8 flex flex-col items-center gap-4 border-b border-gray-100 pb-8">
      <div className="relative mx-auto">
        <div
          className={cn("overflow-hidden rounded-full ring-2 ring-gray-100", busy && "opacity-60")}
        >
          <Avatar src={effectiveUrl} name={nameForAvatar} email={email} size={96} />
        </div>
        <label
          className={cn(
            "absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-[#0056b3] shadow-md transition hover:bg-gray-50",
            busy && "pointer-events-none"
          )}
        >
          <Camera className="h-5 w-5" />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => void onFileChange(e)}
          />
          <span className="sr-only">Upload profile photo</span>
        </label>
      </div>
      {busy ? progressBlock : null}
      <p className="text-center text-sm text-gray-500">Profile & contact details</p>
    </div>
  );
}
