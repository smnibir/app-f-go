"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Upload } from "lucide-react";
import { isSameDay } from "date-fns";
import { TimelineCard } from "@/components/TimelineCard";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Asset, TimelineEntry } from "@prisma/client";
import { cn } from "@/lib/utils";

type Entry = TimelineEntry & { assets: Asset[] };

const filters = [
  { id: "all", label: "All" },
  { id: "past", label: "Past" },
  { id: "present", label: "Present" },
  { id: "upcoming", label: "Upcoming" },
] as const;

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Timeline({
  uploadHref,
  editBase,
}: {
  uploadHref: string;
  editBase: string;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [jumpDate, setJumpDate] = useState(() => toDateInputValue(new Date()));

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/timeline?filter=${filter}`)
      .then((r) => r.json())
      .then((d: { entries?: Entry[] }) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  const jumpTarget = useMemo(() => {
    const [y, m, d] = jumpDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [jumpDate]);

  function jumpToDate() {
    if (!entries?.length) return;
    const match = entries.find((e) => isSameDay(new Date(e.entryDate), jumpTarget));
    if (match) {
      document.getElementById(`timeline-entry-${match.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-navy shadow-sm"
              aria-label="Back to dial"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-[26px] font-bold leading-tight text-navy md:text-[28px]">
              My FutureGo Timeline
            </h1>
          </div>
          <Link href={uploadHref} className="w-full lg:w-auto lg:shrink-0">
            <Button
              type="button"
              className="flex items-center justify-center gap-2 lg:!w-auto lg:min-w-[220px]"
            >
              <Upload className="h-5 w-5" strokeWidth={2} />
              Upload Event
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex w-full flex-col gap-1 sm:max-w-[260px]">
            <label htmlFor="jump-date" className="text-[15px] font-medium text-gray-700">
              Jump to date
            </label>
            <input
              id="jump-date"
              type="date"
              value={jumpDate}
              onChange={(e) => setJumpDate(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-navy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <Button
            type="button"
            className="border-0 bg-accent text-white hover:bg-blue-600 sm:!w-auto sm:min-w-[160px]"
            onClick={jumpToDate}
          >
            Jump to Date
          </Button>
        </div>

        <div className="mb-10 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-[44px] rounded-full border-2 px-5 text-base font-semibold transition",
                filter === f.id ?
                  "border-navy bg-navy text-white"
                : "border-navy bg-white text-navy"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ?
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        : !entries?.length ?
          <div className="flex flex-col items-center py-16 text-center">
            <Calendar className="mb-4 h-16 w-16 text-gray-400" aria-hidden />
            <p className="text-xl font-semibold text-gray-800">Your timeline is empty</p>
            <p className="mt-2 max-w-md text-base text-gray-600">
              Start by uploading your first memory or event.
            </p>
            <Link href={uploadHref} className="mt-8 w-full max-w-sm">
              <Button type="button">Upload Your First Event</Button>
            </Link>
          </div>
        : <div className="relative">
            <div
              className="absolute bottom-0 left-[15px] top-0 hidden w-0.5 bg-accent md:left-1/2 md:block md:-translate-x-1/2"
              aria-hidden
            />
            <ul className="relative space-y-12 md:space-y-16">
              {entries.map((e, i) => {
                const editHref = `${editBase}/${e.id}/edit?from=timeline`;
                const isFuture = new Date(e.entryDate) > new Date();
                return (
                  <li
                    key={e.id}
                    id={`timeline-entry-${e.id}`}
                    className="relative"
                  >
                    <div className="relative pl-10 md:hidden">
                      <div
                        className="absolute bottom-0 left-4 top-0 w-0.5 bg-accent"
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "absolute left-4 top-12 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-sm",
                          isFuture ? "border-gray-300 bg-white" : "bg-accent"
                        )}
                        aria-hidden
                      />
                      <TimelineCard entry={e} editHref={editHref} />
                    </div>

                    <div className="hidden md:grid md:grid-cols-[1fr_48px_1fr] md:items-start md:gap-6">
                      <div className={cn("flex pt-2", i % 2 === 0 ? "justify-end pr-2" : "")}>
                        {i % 2 === 0 ?
                          <TimelineCard entry={e} editHref={editHref} />
                        : null}
                      </div>
                      <div className="flex justify-center pt-10">
                        <span
                          className={cn(
                            "relative z-10 h-4 w-4 rounded-full border-2 border-white shadow-sm",
                            isFuture ? "border-gray-300 bg-white" : "bg-accent"
                          )}
                          aria-hidden
                        />
                      </div>
                      <div className={cn("flex pt-2", i % 2 === 1 ? "justify-start pl-2" : "")}>
                        {i % 2 === 1 ?
                          <TimelineCard entry={e} editHref={editHref} />
                        : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        }
      </div>
    </div>
  );
}
