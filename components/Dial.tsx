"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Waypoints, Upload, Trees, Home, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";

type Props = {
  user: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
};

const DIAL_BLUE = "#0056b3";
const CX = 240;
const CY = 240;
const R_OUTER = 220;
const R_INNER = 88;

function rad(d: number) {
  return (d * Math.PI) / 180;
}

function ringSlicePath(startDeg: number, sweep: number) {
  const a0 = startDeg;
  const a1 = startDeg + sweep;
  const xo0 = CX + R_OUTER * Math.cos(rad(a0));
  const yo0 = CY + R_OUTER * Math.sin(rad(a0));
  const xo1 = CX + R_OUTER * Math.cos(rad(a1));
  const yo1 = CY + R_OUTER * Math.sin(rad(a1));
  const xi0 = CX + R_INNER * Math.cos(rad(a0));
  const yi0 = CY + R_INNER * Math.sin(rad(a0));
  const xi1 = CX + R_INNER * Math.cos(rad(a1));
  const yi1 = CY + R_INNER * Math.sin(rad(a1));
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${xo0} ${yo0}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${xo1} ${yo1}`,
    `L ${xi1} ${yi1}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${xi0} ${yi0}`,
    "Z",
  ].join(" ");
}

const N = 5;
const GAP_DEG = 3.5;
const SEG_WIDTH = (360 - N * GAP_DEG) / N;
const MID_ANGLES = Array.from({ length: N }, (_, i) => -90 + i * (SEG_WIDTH + GAP_DEG));

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

function activeSegmentIndex(pathname: string): number | null {
  if (pathname.startsWith("/dashboard/timeline")) return 0;
  if (pathname.includes("/upload-event")) return 1;
  return null;
}

export function Dial({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<number | null>(null);
  const routeActive = activeSegmentIndex(pathname ?? "");

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 md:py-12">
      <div className="relative aspect-square w-full max-w-[min(100vw-2rem,520px)]">
        <svg viewBox="0 0 480 480" className="h-full w-full">
          <circle cx={CX} cy={CY} r={R_OUTER + 4} fill="#ffffff" />

          {segments.map((seg, i) => {
            const mid = MID_ANGLES[i];
            const start = mid - SEG_WIDTH / 2;
            const path = ringSlicePath(start, SEG_WIDTH);
            const lx = CX + (R_INNER + (R_OUTER - R_INNER) * 0.52) * Math.cos(rad(mid));
            const ly = CY + (R_INNER + (R_OUTER - R_INNER) * 0.52) * Math.sin(rad(mid));
            const Icon = seg.icon;
            const isRoute = !seg.locked && routeActive === i;
            const isHover = !seg.locked && hovered === i;
            const filled = seg.locked ? false : isRoute || isHover;

            return (
              <g
                key={seg.label}
                className="outline-none"
                onMouseEnter={() => !seg.locked && setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={
                  seg.locked ? undefined : () => router.push("href" in seg ? seg.href : "/dashboard")
                }
                role={seg.locked ? undefined : "button"}
                tabIndex={-1}
                style={{ cursor: seg.locked ? "not-allowed" : "pointer" }}
              >
                <title>{seg.locked ? seg.tip : seg.label}</title>
                <path
                  d={path}
                  className="transition-[fill] duration-200 ease-out"
                  fill={seg.locked ? "#ffffff" : filled ? DIAL_BLUE : "#ffffff"}
                  fillOpacity={seg.locked ? 0.65 : 1}
                  stroke="none"
                />
                <foreignObject x={lx - 62} y={ly - 52} width={124} height={104}>
                  <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                    <span className="relative inline-flex">
                      <Icon
                        className={cn(
                          "h-8 w-8",
                          filled ? "text-white"
                          : seg.locked ? "text-gray-400"
                          : "text-[#0056b3]"
                        )}
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
                        "mt-1 px-1 text-[15px] font-semibold leading-tight tracking-tight",
                        seg.locked ? "text-gray-500"
                        : filled ? "text-white"
                        : "text-navy"
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
            <ProfileAvatarUpload variant="dial" user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
