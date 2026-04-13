"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Filter, Upload, X } from "lucide-react";
import { isSameDay } from "date-fns";
import { TimelineCard } from "@/components/TimelineCard";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DatePopoverField } from "@/components/ui/DatePopoverField";
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

function pickCenteredEntryId(entryIds: string[]): string | null {
  if (!entryIds.length) return null;
  const vpMid = typeof window !== "undefined" ? window.innerHeight / 2 : 0;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const id of entryIds) {
    const el = document.getElementById(`timeline-entry-${id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    const d = Math.abs(cy - vpMid);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [lineFillPct, setLineFillPct] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/timeline?filter=${filter}`)
      .then((r) => r.json())
      .then((d: { entries?: Entry[] }) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  const entryIds = useMemo(() => entries?.map((e) => e.id) ?? [], [entries]);

  /** Scroll-centered entry + line fill to that entry’s position (updates every scroll). */
  const syncScrollLinkedUi = useCallback(() => {
    if (!entryIds.length) {
      setActiveEntryId(null);
      setLineFillPct(0);
      return;
    }
    const fromPick = pickCenteredEntryId(entryIds);
    const resolved = fromPick ?? entryIds[0] ?? null;
    if (resolved) setActiveEntryId(resolved);

    const wrap = timelineRef.current;
    if (!wrap || !resolved) {
      setLineFillPct(0);
      return;
    }
    const active = document.getElementById(`timeline-entry-${resolved}`);
    if (!active) {
      setLineFillPct(0);
      return;
    }
    const c = wrap.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    const centerY = a.top + a.height / 2 - c.top;
    const pct = c.height > 0 ? Math.min(100, Math.max(0, (centerY / c.height) * 100)) : 0;
    setLineFillPct(pct);
  }, [entryIds]);

  useEffect(() => {
    if (!entries?.length) {
      setActiveEntryId(null);
      setLineFillPct(0);
      return;
    }
    const run = () => requestAnimationFrame(() => syncScrollLinkedUi());
    run();
    window.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run, { passive: true });
    return () => {
      window.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
    };
  }, [entries, entryIds, syncScrollLinkedUi]);

  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

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
    <div className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#0056b3] shadow-sm transition hover:bg-gray-50"
              aria-label="Back to dial"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-[26px] font-bold leading-tight text-[#0056b3] md:text-[28px]">
              My FutureGo Timeline
            </h1>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:shrink-0">
            <Link href={uploadHref} className="w-full sm:w-auto">
              <Button
                type="button"
                className="flex w-full items-center justify-center gap-2 bg-[#0056b3] hover:bg-[#004a9c] sm:!w-auto sm:min-w-[200px]"
              >
                <Upload className="h-5 w-5" strokeWidth={2} />
                Upload Event
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className={cn(
                "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 px-4 text-base font-semibold transition sm:min-w-[140px] sm:shrink-0",
                filterOpen ?
                  "border-[#0056b3] bg-[#e8f4fc] text-[#0056b3]"
                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              )}
              aria-expanded={filterOpen}
            >
              <Filter className="h-5 w-5" strokeWidth={2} />
              Filters
            </button>
          </div>
        </div>

        {/* Backdrop + flyout panel: slides in from the right */}
        <div
          className={cn(
            "fixed inset-0 z-[60] bg-black/25 transition-opacity duration-300 ease-out",
            filterOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={!filterOpen}
          onClick={() => setFilterOpen(false)}
        />
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out",
            filterOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none translate-x-full"
          )}
          role="dialog"
          aria-modal={filterOpen}
          aria-hidden={!filterOpen}
          aria-label="Timeline filters"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <h2 className="text-lg font-bold text-[#0056b3]">Filters</h2>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Time range</p>
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "min-h-[44px] rounded-full border px-5 text-base font-semibold transition",
                      filter === f.id ?
                        "border-[#b3d9f2] bg-[#e8f4fc] text-[#0056b3]"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-700">Jump to date</span>
              <DatePopoverField value={jumpDate} onChange={setJumpDate} />
              <Button
                type="button"
                className="mt-2 border-0 bg-[#0056b3] text-white hover:bg-[#004a9c]"
                onClick={() => {
                  jumpToDate();
                  setFilterOpen(false);
                }}
              >
                Jump to Date
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
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
                <Button type="button" className="bg-[#0056b3] hover:bg-[#004a9c]">
                  Upload Your First Event
                </Button>
              </Link>
            </div>
          : <div className="relative" ref={timelineRef}>
              <div
                className="pointer-events-none absolute bottom-0 left-4 top-0 z-0 w-0.5 md:left-1/2 md:-translate-x-1/2"
                aria-hidden
              >
                <div className="absolute inset-0 rounded-full bg-[#d8e6f2]" />
                <div
                  className="absolute left-0 top-0 w-full origin-top rounded-full bg-gradient-to-b from-[#0056b3] via-[#1a7fd4] to-[#4db3ff] shadow-[0_0_24px_rgba(0,86,179,0.45)] motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ height: `${lineFillPct}%` }}
                />
              </div>
              <ul className="relative z-[1] space-y-12 md:space-y-16">
                {entries.map((e, i) => {
                  const editHref = `${editBase}/${e.id}/edit?from=timeline`;
                  const isFuture = new Date(e.entryDate) > new Date();
                  const metaAlign = i % 2 === 0 ? "right" : "left";
                  const isActive = activeEntryId === e.id;
                  return (
                    <li key={e.id} id={`timeline-entry-${e.id}`} className="relative">
                      <div className="relative block pl-9 md:hidden">
                        <span
                          className={cn(
                            "absolute left-4 top-12 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-sm motion-safe:transition motion-safe:duration-300",
                            isFuture ? "border-gray-300 bg-white"
                            : isActive ?
                              "scale-110 bg-[#0056b3] shadow-[0_0_0_4px_rgba(0,86,179,0.2)]"
                            : "bg-[#0056b3]"
                          )}
                          aria-hidden
                        />
                        <TimelineCard
                          entry={e}
                          editHref={editHref}
                          uploadedMetaAlign="left"
                          isActive={isActive}
                        />
                      </div>

                      <div className="hidden md:grid md:grid-cols-[1fr_48px_1fr] md:items-start md:gap-6">
                        <div className={cn("flex pt-2", i % 2 === 0 ? "justify-end pr-2" : "")}>
                          {i % 2 === 0 ?
                            <TimelineCard
                              entry={e}
                              editHref={editHref}
                              uploadedMetaAlign={metaAlign}
                              isActive={isActive}
                            />
                          : null}
                        </div>
                        <div className="flex justify-center pt-10">
                          <span
                            className={cn(
                              "relative z-10 h-4 w-4 rounded-full border-2 border-white shadow-sm motion-safe:transition motion-safe:duration-300",
                              isFuture ? "border-gray-300 bg-white"
                              : isActive ?
                                "scale-110 bg-[#0056b3] shadow-[0_0_0_4px_rgba(0,86,179,0.25)]"
                              : "bg-[#0056b3]"
                            )}
                            aria-hidden
                          />
                        </div>
                        <div className={cn("flex pt-2", i % 2 === 1 ? "justify-start pl-2" : "")}>
                          {i % 2 === 1 ?
                            <TimelineCard
                              entry={e}
                              editHref={editHref}
                              uploadedMetaAlign={metaAlign}
                              isActive={isActive}
                            />
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
    </div>
  );
}
