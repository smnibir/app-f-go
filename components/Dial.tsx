"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Waypoints, Upload, Trees, Home, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import {
  DialCoverCornerFab,
  DialCoverDashboardSliders,
  DialCoverProvider,
} from "@/components/DialCoverPanel";

type Props = {
  user: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  dialCover: {
    url: string | null;
    posX: number;
    posY: number;
    zoom: number;
  };
};

const DIAL_BLUE = "#0056b3";
const CX = 240;
const CY = 240;
const R_OUTER = 220;
const R_INNER = 88;
const VB = 480;

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

/** Icon ring radius — matches former foreignObject anchor (avoids WebKit foreignObject misalignment). */
const ICON_R = R_INNER + (R_OUTER - R_INNER) * 0.52;

export function Dial({ user, dialCover }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<number | null>(null);
  const routeActive = activeSegmentIndex(pathname ?? "");

  return (
    <DialCoverProvider
      initial={{
        url: dialCover.url,
        posX: dialCover.posX,
        posY: dialCover.posY,
        zoom: dialCover.zoom,
      }}
    >
      <div className="flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div
          className="relative aspect-square w-full max-w-[min(100vw-2rem,520px)] overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/[0.06]"
          style={{ touchAction: "manipulation" }}
        >
        {dialCover.url ?
          <div className="pointer-events-none absolute inset-0">
            <div
              className="h-full w-full will-change-transform"
              style={{
                transform: `scale(${dialCover.zoom / 100})`,
                transformOrigin: `${dialCover.posX}% ${dialCover.posY}%`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dialCover.url}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: `${dialCover.posX}% ${dialCover.posY}%` }}
                draggable={false}
              />
            </div>
          </div>
        : null}

        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="relative z-[1] h-full w-full select-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {segments.map((seg, i) => {
            const mid = MID_ANGLES[i];
            const start = mid - SEG_WIDTH / 2;
            const path = ringSlicePath(start, SEG_WIDTH);
            const isRoute = !seg.locked && routeActive === i;
            const isHover = !seg.locked && hovered === i;
            const filled = seg.locked ? false : isRoute || isHover;

            return (
              <path
                key={seg.label}
                d={path}
                className="pointer-events-none transition-[fill] duration-200 ease-out"
                fill={seg.locked ? "#ffffff" : filled ? DIAL_BLUE : "#ffffff"}
                fillOpacity={seg.locked ? 0.65 : 1}
                stroke="none"
              >
                <title>{seg.locked ? seg.tip : seg.label}</title>
              </path>
            );
          })}
          <circle cx={CX} cy={CY} r={R_INNER} fill="#ffffff" />
        </svg>

        {segments.map((seg, i) => {
          const mid = MID_ANGLES[i];
          const lx = CX + ICON_R * Math.cos(rad(mid));
          const ly = CY + ICON_R * Math.sin(rad(mid));
          const leftPct = (lx / VB) * 100;
          const topPct = (ly / VB) * 100;
          const Icon = seg.icon;
          const isRoute = !seg.locked && routeActive === i;
          const isHover = !seg.locked && hovered === i;
          const filled = seg.locked ? false : isRoute || isHover;

          return (
            <button
              key={`btn-${seg.label}`}
              type="button"
              className={cn(
                "absolute z-[2] flex max-h-[28%] min-h-[72px] w-[26%] max-w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center sm:max-h-[30%] sm:min-h-[80px]",
                seg.locked ? "cursor-not-allowed" : "cursor-pointer active:opacity-95"
              )}
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              disabled={seg.locked}
              aria-label={seg.locked ? (seg.tip ?? seg.label) : seg.label}
              onMouseEnter={() => !seg.locked && setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (!seg.locked && "href" in seg) router.push(seg.href);
              }}
            >
              <span className="relative inline-flex shrink-0">
                <Icon
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8",
                    filled ? "text-white"
                    : seg.locked ? "text-gray-400"
                    : "text-[#0056b3]"
                  )}
                  strokeWidth={1.75}
                />
                {seg.locked && seg.lockBadge ?
                  <span className="absolute -right-0.5 -top-0.5 rounded-full bg-gray-100 p-0.5">
                    <Lock className="h-2.5 w-2.5 text-gray-500 sm:h-3 sm:w-3" aria-hidden />
                  </span>
                : null}
              </span>
              <span
                className={cn(
                  "mt-0.5 max-w-full px-0.5 text-[13px] font-semibold leading-[1.15] tracking-tight sm:text-[15px]",
                  seg.locked ? "text-gray-500"
                  : filled ? "text-white"
                  : "text-navy"
                )}
              >
                {seg.label}
              </span>
            </button>
          );
        })}

        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <ProfileAvatarUpload variant="dial" user={user} />
          </div>
        </div>

        <DialCoverCornerFab side="right" />
      </div>

        <DialCoverDashboardSliders />
      </div>
    </DialCoverProvider>
  );
}
