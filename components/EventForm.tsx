"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { startOfDay } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DatePicker } from "@/components/ui/DatePicker";
import { Toggle } from "@/components/ui/Toggle";
import type { UploadedFile } from "@/components/ui/FileUpload";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toaster";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Mode = "create" | "edit";

export type EventFormInitial = {
  title: string;
  description?: string | null;
  entryDate: Date;
  publishImmediately: boolean;
  publishAt?: Date | null;
  status: string;
  assets: (UploadedFile & { assetId?: string })[];
};

export function EventForm({
  mode,
  backHref,
  entryId,
  initial,
}: {
  mode: Mode;
  backHref: string;
  entryId?: string;
  initial?: EventFormInitial;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(() => startOfDay(initial?.entryDate ?? new Date()));
  const [publishImmediately, setPublishImmediately] = useState(
    initial?.publishImmediately ?? true
  );
  const [scheduleAt, setScheduleAt] = useState(() => {
    if (initial?.publishAt) {
      const d = initial.publishAt;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return "";
  });
  const [files, setFiles] = useState<(UploadedFile & { assetId?: string })[]>(
    initial?.assets ?? []
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const labelDate = useMemo(() => {
    const today = startOfDay(new Date());
    if (startOfDay(date).getTime() === today.getTime()) return "Today";
    return format(date, "d MMMM yyyy");
  }, [date]);

  async function removeFile(publicId: string) {
    const row = files.find((f) => f.publicId === publicId);
    if (row?.assetId) setRemovedIds((r) => [...r, row.assetId!]);
    await fetch(`/api/upload?publicId=${encodeURIComponent(publicId)}`, { method: "DELETE" });
    setFiles((f) => f.filter((x) => x.publicId !== publicId));
  }

  function newAssetsOnly() {
    const initialIds = new Set((initial?.assets ?? []).map((a) => a.publicId));
    return files.filter((f) => !initialIds.has(f.publicId));
  }

  async function saveDraft() {
    setLoading(true);
    const entryDateIso = startOfDay(date).toISOString();
    const base = {
      title,
      description: description || undefined,
      entryDate: entryDateIso,
      publishImmediately: false,
      publishAt: null as string | null,
      status: "DRAFT" as const,
      assets: files.map((f) => ({
        url: f.url,
        publicId: f.publicId,
        type: f.type,
        filename: f.filename,
        size: f.size,
      })),
    };
    const url = mode === "create" ? "/api/timeline" : `/api/timeline/${entryId}`;
    const body =
      mode === "edit" ?
        {
          ...base,
          removedAssetIds: removedIds,
          newAssets: newAssetsOnly().map((f) => ({
            url: f.url,
            publicId: f.publicId,
            type: f.type,
            filename: f.filename,
            size: f.size,
          })),
        }
      : base;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Could not save", variant: "destructive" });
      return;
    }
    toast({ title: "Draft saved" });
    router.push("/dashboard/timeline");
    router.refresh();
  }

  async function publishOrSchedule() {
    setLoading(true);
    const wantsSchedule = !publishImmediately && !!scheduleAt;
    const scheduled = wantsSchedule && new Date(scheduleAt) > new Date();
    const status: "PUBLISHED" | "SCHEDULED" = scheduled ? "SCHEDULED" : "PUBLISHED";
    const entryDateIso = startOfDay(date).toISOString();
    const publishAtIso =
      !publishImmediately && scheduleAt ? new Date(scheduleAt).toISOString() : null;

    const base = {
      title,
      description: description || undefined,
      entryDate: entryDateIso,
      publishImmediately: publishImmediately && status !== "SCHEDULED",
      publishAt: publishAtIso,
      status,
      assets: files.map((f) => ({
        url: f.url,
        publicId: f.publicId,
        type: f.type,
        filename: f.filename,
        size: f.size,
      })),
    };
    const url = mode === "create" ? "/api/timeline" : `/api/timeline/${entryId}`;
    const body =
      mode === "edit" ?
        {
          ...base,
          removedAssetIds: removedIds,
          newAssets: newAssetsOnly().map((f) => ({
            url: f.url,
            publicId: f.publicId,
            type: f.type,
            filename: f.filename,
            size: f.size,
          })),
        }
      : base;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Could not save", variant: "destructive" });
      return;
    }
    toast({ title: scheduled ? "Event scheduled" : "Published to timeline" });
    router.push("/dashboard/timeline");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href={backHref}
        className="mb-6 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold text-navy"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <h1 className="mb-8 text-3xl font-bold text-navy">
        {mode === "create" ? "Upload Event" : "Edit Event"}
      </h1>

      <div className="space-y-6">
        <div>
          <label className="mb-1 block text-base font-medium text-gray-800">Event Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My wedding day"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-gray-800">
            What happened? (optional)
          </label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <p className="mb-1 text-base font-medium text-gray-800">When did this happen? *</p>
          <DatePicker value={date} onChange={(d) => setDate(startOfDay(d))} />
          <p className="mt-2 text-base text-gray-700">{labelDate}</p>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-base font-semibold text-navy">
            When should this appear on your timeline?
          </p>
          <Toggle
            id="pub"
            label="Publish immediately"
            checked={publishImmediately}
            onCheckedChange={setPublishImmediately}
          />
          {!publishImmediately ?
            <div>
              <label className="mb-1 block text-base text-gray-800">Date and time</label>
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="min-h-[52px]"
              />
              {scheduleAt ?
                <p className="mt-2 text-base text-gray-700">
                  This will appear on {format(new Date(scheduleAt), "d MMMM yyyy 'at' HH:mm")}
                </p>
              : null}
            </div>
          : null}
        </div>
        <div>
          <p className="mb-2 text-base font-medium text-gray-800">Upload files (optional)</p>
          <FileUpload
            files={files}
            onAdd={(f) => setFiles((x) => [...x, f])}
            onRemove={(pid) => void removeFile(pid)}
            accept="image/jpeg,image/png,video/mp4,video/quicktime,audio/mpeg,application/pdf"
          />
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void saveDraft()}>
            Save as Draft
          </Button>
          <Button type="button" disabled={loading} onClick={() => void publishOrSchedule()}>
            {!publishImmediately && scheduleAt && new Date(scheduleAt) > new Date() ?
              "Schedule Event"
            : "Publish to Timeline"}
          </Button>
        </div>
        {mode === "edit" && entryId ?
          <>
            <Button
              type="button"
              variant="danger"
              className="mt-8"
              onClick={() => setConfirmDel(true)}
            >
              Delete Event
            </Button>
            <ConfirmModal
              open={confirmDel}
              onOpenChange={setConfirmDel}
              title="Delete this event?"
              message="This removes the event and all attached files permanently."
              confirmLabel="Delete"
              destructive
              loading={loading}
              onConfirm={async () => {
                setLoading(true);
                const res = await fetch(`/api/timeline/${entryId}`, { method: "DELETE" });
                setLoading(false);
                setConfirmDel(false);
                if (!res.ok) {
                  toast({ title: "Could not delete", variant: "destructive" });
                  return;
                }
                toast({ title: "Event deleted" });
                router.push("/dashboard/timeline");
                router.refresh();
              }}
            />
          </>
        : null}
      </div>
    </div>
  );
}
