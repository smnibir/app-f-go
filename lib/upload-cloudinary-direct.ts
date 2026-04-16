import type { AssetType } from "@prisma/client";
import { MAX_UPLOAD_BYTES } from "@/lib/asset-types";
import { postFormDataWithProgress } from "@/lib/upload-xhr";

export type DirectTimelineOk = {
  url: string;
  publicId: string;
  type: AssetType;
  filename: string;
  size: number;
};

/**
 * Timeline/media upload: browser → Cloudinary (signed), not through Next.js.
 * Required on Vercel so files &gt; ~4.5MB do not hit HTTP 413.
 */
export async function uploadTimelineFileDirect(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ ok: true; data: DirectTimelineOk } | { ok: false; error: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File must be 50MB or smaller" };
  }

  const sigRes = await fetch("/api/upload/cloudinary-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      mime: file.type || "application/octet-stream",
      purpose: "timeline",
      size: file.size,
    }),
  });

  const sig = (await sigRes.json().catch(() => ({}))) as {
    error?: string;
    cloudName?: string;
    apiKey?: string;
    timestamp?: number;
    signature?: string;
    folder?: string;
    resourceType?: string;
    assetType?: AssetType;
  };

  if (!sigRes.ok) {
    return {
      ok: false,
      error: typeof sig.error === "string" ? sig.error : "Could not start upload",
    };
  }

  if (
    !sig.cloudName ||
    !sig.apiKey ||
    !sig.signature ||
    sig.timestamp === undefined ||
    !sig.folder ||
    !sig.resourceType ||
    !sig.assetType
  ) {
    return { ok: false, error: "Invalid upload configuration" };
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  fd.append("use_filename", "true");
  fd.append("unique_filename", "true");

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;

  const { ok, data } = await postFormDataWithProgress(endpoint, fd, onProgress);

  const raw = data as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    error?: { message?: string };
  };

  if (!ok) {
    const msg =
      raw?.error && typeof raw.error === "object" && raw.error.message ?
        raw.error.message
      : "Upload failed (check Cloudinary settings and file type)";
    return { ok: false, error: msg };
  }

  if (!raw.secure_url || !raw.public_id) {
    return { ok: false, error: "Invalid response from storage" };
  }

  return {
    ok: true,
    data: {
      url: raw.secure_url,
      publicId: raw.public_id,
      type: sig.assetType,
      filename: file.name,
      size: raw.bytes ?? file.size,
    },
  };
}
