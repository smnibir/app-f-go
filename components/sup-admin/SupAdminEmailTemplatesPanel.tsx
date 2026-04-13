"use client";

import { useCallback, useEffect, useState } from "react";
import { Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

function formatTemplateTitle(key: string) {
  return key
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

/** Wrap fragment HTML for iframe preview, or pass through full documents */
function emailPreviewSrcDoc(html: string) {
  const t = html.trim();
  if (/^<!DOCTYPE/i.test(t) || /^<html[\s>]/i.test(t)) return t;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,sans-serif;margin:16px;line-height:1.5;color:#111827;word-wrap:break-word;}</style></head><body>${t}</body></html>`;
}

type TemplateRow = {
  id: string;
  key: string;
  subject: string;
  htmlBody: string;
  variables: string;
  updatedAt: string;
};

export function SupAdminEmailTemplatesPanel({ dbConnected }: { dbConnected: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [variables, setVariables] = useState("");
  const [bodyMode, setBodyMode] = useState<"visual" | "code">("code");

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sup-admin/email-templates");
    const json = await res.json();
    if (!res.ok) {
      toast({
        title: "Could not load templates",
        description: typeof json.error === "string" ? json.error : "Try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const list = (json.templates || []) as TemplateRow[];
    setTemplates(list);
    setSelectedKey((curr) => curr ?? list[0]?.key ?? null);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!dbConnected) return;
    void load();
  }, [dbConnected, load]);

  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subject);
    setHtmlBody(selected.htmlBody);
    setVariables(selected.variables);
    setBodyMode("code");
  }, [selectedKey, selected]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKey) return;
    if (!htmlBody.trim()) {
      toast({
        title: "HTML body required",
        description: "Add HTML in the editor, or switch to Visual to confirm the preview.",
        variant: "destructive",
      });
      setBodyMode("code");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sup-admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          subject: subject.trim(),
          htmlBody,
          variables: variables.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Save failed",
          description: typeof json.error === "string" ? json.error : "Try again.",
          variant: "destructive",
        });
        return;
      }
      const t = json.template as TemplateRow;
      setTemplates((prev) =>
        prev.map((x) => (x.key === t.key ? { ...x, ...t, updatedAt: t.updatedAt } : x))
      );
      toast({ title: "Template saved", description: formatTemplateTitle(t.key) });
    } finally {
      setSaving(false);
    }
  }

  if (!dbConnected) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Connect <code className="rounded bg-white px-1">DATABASE_URL</code> to edit templates.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-gray-600">
        No templates in the database. Run <code className="rounded bg-gray-100 px-1">npx prisma db seed</code>{" "}
        to create defaults.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <nav className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Template
        </p>
        <ul className="flex flex-col gap-1">
          {templates.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => setSelectedKey(t.key)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                  selectedKey === t.key ? "bg-navy/10 text-navy" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {formatTemplateTitle(t.key)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {selected ?
          <>
            <p className="mb-4 text-xs text-gray-500">
              Last updated: {new Date(selected.updatedAt).toLocaleString()}
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="min-h-[48px]"
              />
            </div>
            <div className="mb-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">Email body</label>
                <div
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
                  role="tablist"
                  aria-label="Body editor mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={bodyMode === "code"}
                    onClick={() => setBodyMode("code")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition",
                      bodyMode === "code" ?
                        "bg-white text-navy shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Code2 className="h-4 w-4" aria-hidden />
                    HTML
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={bodyMode === "visual"}
                    onClick={() => setBodyMode("visual")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition",
                      bodyMode === "visual" ?
                        "bg-white text-navy shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    Visual
                  </button>
                </div>
              </div>
              {bodyMode === "visual" ?
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    Preview (approximate — email clients may still vary)
                  </div>
                  <iframe
                    title="Email HTML preview"
                    className="min-h-[min(420px,50vh)] w-full bg-white sm:min-h-[360px]"
                    sandbox=""
                    srcDoc={emailPreviewSrcDoc(htmlBody)}
                  />
                </div>
              : <Textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  className="min-h-[320px] font-mono text-sm"
                  spellCheck={false}
                />
              }
              <p className="mt-2 text-xs text-gray-500">
                Use placeholders like <code className="rounded bg-gray-100 px-1">{"{{name}}"}</code> — they are
                replaced when sending. Switch to <strong>Visual</strong> for a live preview (approximate).
              </p>
            </div>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">Variable names</label>
              <Input
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                className="min-h-[44px] font-mono text-sm"
                placeholder="name, link, app_name, …"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save template"}
            </Button>
          </>
        : null}
      </form>
    </div>
  );
}
