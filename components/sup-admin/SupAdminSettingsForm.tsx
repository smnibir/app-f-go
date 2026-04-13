"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { postFormDataWithProgress } from "@/lib/upload-xhr";

type SettingsPayload = {
  app_name: string;
  logo_url: string;
  logo_public_id: string;
  from_email: string;
  sendgrid: { masked: string; configured: boolean };
  cloudinary_cloud_name: string;
  cloudinary_api_key: { masked: string; configured: boolean };
  cloudinary_api_secret: { masked: string; configured: boolean };
};

export function SupAdminSettingsForm({ dbConnected }: { dbConnected: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettingsPayload | null>(null);

  const [appName, setAppName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [sendgridKey, setSendgridKey] = useState("");
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState("");
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState("");
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [logoUploadPct, setLogoUploadPct] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sup-admin/settings");
    const json = await res.json();
    if (!res.ok) {
      toast({
        title: "Could not load settings",
        description: typeof json.error === "string" ? json.error : "Try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const s = json as SettingsPayload;
    setData(s);
    setAppName(s.app_name);
    setFromEmail(s.from_email);
    setLogoUrl(s.logo_url);
    setLogoPublicId(s.logo_public_id);
    setSendgridKey("");
    setCloudinaryCloudName(s.cloudinary_cloud_name ?? "");
    setCloudinaryApiKey("");
    setCloudinaryApiSecret("");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!dbConnected) return;
    void load();
  }, [dbConnected, load]);

  async function onUploadLogo(file: File) {
    setUploading(true);
    setLogoUploadPct(0);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("purpose", "branding");
      const { ok, data } = await postFormDataWithProgress("/api/upload", fd, (pct) =>
        setLogoUploadPct(pct)
      );
      const json = data as { error?: string; url?: string; publicId?: string };
      if (!ok) {
        toast({
          title: "Upload failed",
          description: json.error || "Could not upload logo.",
          variant: "destructive",
        });
        return;
      }
      setLogoUrl(json.url!);
      setLogoPublicId(json.publicId!);
      const patch = await fetch("/api/sup-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: json.url!, logo_public_id: json.publicId! }),
      });
      const out = await patch.json();
      if (!patch.ok) {
        toast({
          title: "Could not save logo",
          description: typeof out.error === "string" ? out.error : "Try again.",
          variant: "destructive",
        });
        return;
      }
      if (out.settings) {
        setData(out.settings);
        setAppName(out.settings.app_name);
        setFromEmail(out.settings.from_email);
        setLogoUrl(out.settings.logo_url);
        setLogoPublicId(out.settings.logo_public_id);
      }
      toast({ title: "Logo updated", description: "Branding saved." });
    } finally {
      setUploading(false);
      setLogoUploadPct(0);
    }
  }

  async function removeLogo() {
    setSaving(true);
    try {
      const res = await fetch("/api/sup-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: "", logo_public_id: "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Could not remove logo",
          description: typeof json.error === "string" ? json.error : "Try again.",
          variant: "destructive",
        });
        return;
      }
      if (json.settings) {
        setData(json.settings);
        setLogoUrl("");
        setLogoPublicId("");
        setAppName(json.settings.app_name);
        setFromEmail(json.settings.from_email);
      }
      toast({ title: "Logo removed" });
    } finally {
      setSaving(false);
    }
  }

  async function saveTextFields(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {
        app_name: appName.trim(),
        from_email: fromEmail.trim(),
      };
      if (sendgridKey.trim()) body.sendgrid_api_key = sendgridKey.trim();
      body.cloudinary_cloud_name = cloudinaryCloudName.trim();
      if (cloudinaryApiKey.trim()) body.cloudinary_api_key = cloudinaryApiKey.trim();
      if (cloudinaryApiSecret.trim()) body.cloudinary_api_secret = cloudinaryApiSecret.trim();

      const res = await fetch("/api/sup-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Save failed",
          description:
            typeof json.error === "object" && json.error ?
              JSON.stringify(json.error)
            : typeof json.error === "string" ? json.error
            : "Try again.",
          variant: "destructive",
        });
        return;
      }
      if (json.settings) {
        setData(json.settings);
        setSendgridKey("");
        setCloudinaryApiKey("");
        setCloudinaryApiSecret("");
      }
      toast({ title: "Settings saved" });
    } finally {
      setSaving(false);
    }
  }

  if (!dbConnected) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Connect <code className="rounded bg-white px-1">DATABASE_URL</code> to manage settings.
      </p>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-navy">Branding</h2>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-center">
          <div className="flex w-full flex-col items-center gap-3 md:items-center">
            {logoUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-auto max-h-24 max-w-[240px] rounded-lg border border-gray-100 object-contain"
              />
            : <div className="flex h-24 w-48 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                No logo
              </div>
            }
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-2">
              {uploading ?
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-navy transition-[width] duration-150"
                      style={{ width: `${logoUploadPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-xs text-gray-600">Uploading logo… {logoUploadPct}%</p>
                </div>
              : null}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-70")}>
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-gray-50">
                    {uploading ? "Uploading…" : "Upload logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploading || saving}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void onUploadLogo(f);
                    }}
                  />
                </label>
                {(logoUrl || logoPublicId) ?
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    disabled={saving || uploading}
                    onClick={() => void removeLogo()}
                  >
                    Remove logo
                  </button>
                : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={saveTextFields} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-navy">App, email & integrations</h2>
        <div className="grid max-w-lg gap-4">
          <div>
            <label htmlFor="app_name" className="mb-1 block text-sm font-medium text-gray-700">
              App name
            </label>
            <Input
              id="app_name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              required
              className="min-h-[48px]"
            />
          </div>
          <div>
            <label htmlFor="from_email" className="mb-1 block text-sm font-medium text-gray-700">
              SendGrid from address
            </label>
            <Input
              id="from_email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              required
              className="min-h-[48px]"
            />
          </div>
          <div>
            <label htmlFor="sg_key" className="mb-1 block text-sm font-medium text-gray-700">
              SendGrid API key
            </label>
            {data.sendgrid.configured ?
              <p className="mb-2 font-mono text-sm text-gray-600">
                Current: <span className="select-none">{data.sendgrid.masked}</span>
              </p>
            : <p className="mb-2 text-sm text-amber-800">No key stored — transactional email will be skipped.</p>}
            <Input
              id="sg_key"
              type="password"
              autoComplete="new-password"
              value={sendgridKey}
              onChange={(e) => setSendgridKey(e.target.value)}
              placeholder="Paste a new key to replace the stored one"
              className={cn("min-h-[48px] font-mono text-sm")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to keep the current key. Never share this page publicly.
            </p>
          </div>
          <div>
            <label htmlFor="c_cloud" className="mb-1 block text-sm font-medium text-gray-700">
              Cloudinary cloud name
            </label>
            <Input
              id="c_cloud"
              value={cloudinaryCloudName}
              onChange={(e) => setCloudinaryCloudName(e.target.value)}
              placeholder="your-cloud-name"
              autoComplete="off"
              className="min-h-[48px] font-mono text-sm"
            />
          </div>
          <div>
            <label htmlFor="c_key" className="mb-1 block text-sm font-medium text-gray-700">
              Cloudinary API key
            </label>
            {data.cloudinary_api_key.configured ?
              <p className="mb-2 font-mono text-sm text-gray-600">
                Current: <span className="select-none">{data.cloudinary_api_key.masked}</span>
              </p>
            : <p className="mb-2 text-sm text-amber-800">No key stored — env vars will be used if set.</p>}
            <Input
              id="c_key"
              type="password"
              autoComplete="new-password"
              value={cloudinaryApiKey}
              onChange={(e) => setCloudinaryApiKey(e.target.value)}
              placeholder="Paste a new key to replace the stored one"
              className={cn("min-h-[48px] font-mono text-sm")}
            />
          </div>
          <div>
            <label htmlFor="c_secret" className="mb-1 block text-sm font-medium text-gray-700">
              Cloudinary API secret
            </label>
            {data.cloudinary_api_secret.configured ?
              <p className="mb-2 font-mono text-sm text-gray-600">
                Current: <span className="select-none">{data.cloudinary_api_secret.masked}</span>
              </p>
            : <p className="mb-2 text-sm text-amber-800">No secret stored — env vars will be used if set.</p>}
            <Input
              id="c_secret"
              type="password"
              autoComplete="new-password"
              value={cloudinaryApiSecret}
              onChange={(e) => setCloudinaryApiSecret(e.target.value)}
              placeholder="Paste a new secret to replace the stored one"
              className={cn("min-h-[48px] font-mono text-sm")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave key and secret blank to keep current values. Matches SendGrid-style storage in the database.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
