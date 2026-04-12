"use client";

import Image from "next/image";
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
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        unoptimized
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
