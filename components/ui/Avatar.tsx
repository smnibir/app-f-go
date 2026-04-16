"use client";

import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  email,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  email: string;
  size?: number;
  className?: string;
}) {
  const initials =
    name?.trim() ?
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : email.slice(0, 2).toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avoid Next/Image caching; profile URLs must always reflect latest upload
      <img
        key={src}
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-navy text-white font-semibold",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
