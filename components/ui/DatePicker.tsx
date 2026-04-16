"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  minYear?: number;
  maxYear?: number;
  /** Hide the “Selected:” footer (e.g. inside a popover) */
  compact?: boolean;
};

export function DatePicker({ value, onChange, minYear = 1900, maxYear = 2100, compact = false }: Props) {
  const monthSelectId = useId();
  const yearSelectId = useId();
  const [view, setView] = useState(() => startOfMonth(value));

  useEffect(() => {
    setView(startOfMonth(value));
  }, [value]);

  const yearsDesc = useMemo(() => {
    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, maxYear]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(view));
    const end = endOfWeek(endOfMonth(view));
    return eachDayOfInterval({ start, end });
  }, [view]);

  const canPrev = view.getFullYear() > minYear || view.getMonth() > 0;
  const canNext = view.getFullYear() < maxYear || view.getMonth() < 11;

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white", compact ? "p-3 sm:p-4" : "p-4")}>
      <div className="mb-4 flex w-full items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setView((v) => addMonths(v, -1))}
          className="flex min-h-[48px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-200 text-navy disabled:opacity-40"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <label htmlFor={monthSelectId} className="sr-only">
          Month
        </label>
        <select
          id={monthSelectId}
          value={view.getMonth()}
          onChange={(e) => {
            const m = Number.parseInt(e.target.value, 10);
            setView((v) => startOfMonth(setMonth(v, m)));
          }}
          className={cn(
            "min-h-[44px] min-w-0 flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-semibold text-navy shadow-sm sm:px-3 sm:text-base",
            "focus:border-[#0056b3] focus:outline-none focus:ring-2 focus:ring-[#0056b3]/25"
          )}
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <label htmlFor={yearSelectId} className="sr-only">
          Year
        </label>
        <select
          id={yearSelectId}
          value={view.getFullYear()}
          onChange={(e) => {
            const y = Number.parseInt(e.target.value, 10);
            setView((v) => startOfMonth(setYear(v, y)));
          }}
          className={cn(
            "min-h-[44px] w-[4.75rem] shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm font-semibold text-navy tabular-nums shadow-sm sm:w-[5.5rem] sm:text-base",
            "focus:border-[#0056b3] focus:outline-none focus:ring-2 focus:ring-[#0056b3]/25"
          )}
        >
          {yearsDesc.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setView((v) => addMonths(v, 1))}
          className="flex min-h-[48px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-200 text-navy disabled:opacity-40"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[15px] font-medium text-gray-500">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, view);
          const selected = isSameDay(day, value);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(day)}
              className={cn(
                "flex min-h-[44px] items-center justify-center rounded-lg text-base",
                !inMonth && "text-gray-300",
                inMonth && !selected && "text-gray-900 hover:bg-gray-100",
                selected && "bg-navy font-semibold text-white"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      {!compact ?
        <p className="mt-4 text-center text-base text-gray-700" aria-live="polite">
          Selected:{" "}
          <span className="font-semibold text-navy">
            {format(value, "d MMMM yyyy")}
          </span>
        </p>
      : null}
    </div>
  );
}
