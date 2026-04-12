"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import {
  Waypoints,
  Upload,
  Trees,
  Home,
  Lock,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  user: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
};

const cx = 240;
const cy = 240;
const rOuter = 220;
const rInner = 88;

function deg(d: number) {
  return (d * Math.PI) / 180;
}

function ringSlicePath(startDeg: number, sweep: number) {
  const a0 = startDeg;
  const a1 = startDeg + sweep;
  const xo0 = cx + rOuter * Math.cos(deg(a0));
  const yo0 = cy + rOuter * Math.sin(deg(a0));
  const xo1 = cx + rOuter * Math.cos(deg(a1));
  const yo1 = cy + rOuter * Math.sin(deg(a1));
  const xi0 = cx + rInner * Math.cos(deg(a0));
  const yi0 = cy + rInner * Math.sin(deg(a0));
  const xi1 = cx + rInner * Math.cos(deg(a1));
  const yi1 = cy + rInner * Math.sin(deg(a1));
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${xo0} ${yo0}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${xo1} ${yo1}`,
    `L ${xi1} ${yi1}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0}`,
    "Z",
  ].join(" ");
}

const SLICE = 72;
const START = -90 - SLICE / 2;

const segments = [
  { label: "View Timeline", icon: Waypoints, href: "/dashboard/timeline", locked: false, lockBadge: false },
  {
    label: "Upload Media",
    icon: Upload,
    href: "/dashboard/upload-event?from=dial",
    locked: false,
    lockBadge: false,
  },
  { label: "Family Tree", icon: Trees, locked: true, tip: "Coming soon", lockBadge: true },
  { label: "Manage Estate", icon: Home, locked: true, tip: "Coming soon", lockBadge: true },
  { label: "Documents", icon: Lock, locked: true, tip: "Coming soon", lockBadge: false },
] as const;

export function Dial({ user }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", "avatar");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; publicId?: string; error?: string };
    if (!res.ok || !data.url || !data.publicId) return;
    await fetch("/api/user/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: data.url, avatarPublicId: data.publicId }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 md:py-12">
      <div className="relative w-full max-w-[min(100vw-2rem,520px)] aspect-square">
        <svg viewBox="0 0 480 480" className="h-full w-full">
          <circle cx={cx} cy={cy} r={rOuter + 4} fill="#ffffff" stroke="#e5e7eb" strokeWidth={1} />
          {segments.map((seg, i) => {
            const start = START + i * SLICE;
            const path = ringSlicePath(start, SLICE);
            const mid = start + SLICE / 2;
            const lx = cx + (rInner + (rOuter - rInner) * 0.52) * Math.cos(deg(mid));
            const ly = cy + (rInner + (rOuter - rInner) * 0.52) * Math.sin(deg(mid));
            const Icon = seg.icon;
            return (
              <g
                key={seg.label}
                className={cn(
                  "group",
                  !seg.locked && "cursor-pointer hover:[&>path:first-child]:fill-gray-50"
                )}
                onClick={
                  seg.locked ?
                    undefined
                  : () => router.push("href" in seg ? seg.href : "/dashboard")
                }
                role={seg.locked ? undefined : "link"}
                tabIndex={seg.locked ? -1 : 0}
                onKeyDown={
                  seg.locked ?
                    undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push("href" in seg ? seg.href : "/dashboard");
                      }
                    }
                }
              >
                <title>{seg.locked ? seg.tip : seg.label}</title>
                <path
                  d={path}
                  className={cn(
                    "stroke-gray-200 stroke-[1] transition-colors",
                    seg.locked ? "cursor-not-allowed fill-white opacity-60" : "fill-white"
                  )}
                />
                <foreignObject x={lx - 60} y={ly - 52} width={120} height={104}>
                  <div className="flex h-full w-full flex-col items-center justify-center text-center">
                    <span className="relative inline-flex">
                      <Icon
                        className={cn("h-8 w-8", seg.locked ? "text-gray-400" : "text-navy")}
                        strokeWidth={1.75}
                      />
                      {seg.locked && seg.lockBadge ?
                        <span className="absolute -right-1 -top-1 rounded-full bg-gray-100 p-0.5">
                          <Lock className="h-3 w-3 text-gray-500" aria-hidden />
                        </span>
                      : null}
                    </span>
                    <span
                      className={cn(
                        "mt-2 px-1 text-[16px] font-semibold leading-tight tracking-tight",
                        seg.locked ? "text-gray-500" : "text-navy"
                      )}
                    >
                      {seg.label}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-[128px] w-[128px] flex-col items-center justify-center gap-2 rounded-full border border-gray-200 bg-white shadow-sm"
              aria-label="Upload your photo"
            >
              {user.avatarUrl ?
                <Avatar src={user.avatarUrl} name={user.name} email={user.email} size={120} />
              : <>
                  <Camera className="h-10 w-10 text-navy" strokeWidth={1.5} />
                  <span className="px-2 text-center text-[16px] font-semibold leading-snug text-navy">
                    Upload your photo
                  </span>
                </>
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onAvatarFile(e)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
