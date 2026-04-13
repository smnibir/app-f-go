"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";

function parseYmd(s: string): Date {
  const d = parse(s, "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computePlacement(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const pad = 8;
  const w = Math.min(360, Math.max(280, r.width));
  let left = r.left + (r.width - w) / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
  const top = r.bottom + pad;
  const maxTop = window.innerHeight - 400;
  return {
    top: Math.min(top, Math.max(pad, maxTop)),
    left,
    width: w,
  };
}

type Props = {
  id?: string;
  value: string;
  onChange: (yyyyMmDd: string) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Month calendar in a portal (avoids transform/stacking issues inside drawers).
 * Opens when the field is clicked.
 */
export function DatePopoverField({ id, value, onChange, className, disabled }: Props) {
  const autoId = useId();
  const fieldId = id ?? `date-field-${autoId}`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const date = parseYmd(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPlacement(null);
      return;
    }
    setPlacement(computePlacement(triggerRef.current));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!triggerRef.current) return;
      setPlacement(computePlacement(triggerRef.current));
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer, true);
    return () => document.removeEventListener("pointerdown", handlePointer, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const popover =
    mounted &&
    open &&
    placement &&
    createPortal(
      <div
        ref={popRef}
        className="fixed max-h-[min(70vh,520px)] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
          zIndex: 9999,
        }}
        role="dialog"
        aria-label="Choose date"
      >
        <DatePicker
          compact
          value={date}
          onChange={(d) => {
            onChange(toYmd(d));
            setOpen(false);
          }}
        />
      </div>,
      document.body
    );

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        className={cn(
          "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-base text-navy transition",
          "hover:border-[#0056b3]/40 focus:border-[#0056b3] focus:outline-none focus:ring-2 focus:ring-[#0056b3]/25",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="min-w-0 truncate font-medium">{format(date, "d MMM yyyy")}</span>
        <CalendarDays className="h-5 w-5 shrink-0 text-[#0056b3]" aria-hidden />
      </button>
      {popover}
    </div>
  );
}
