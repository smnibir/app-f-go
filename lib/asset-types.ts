import type { AssetType } from "@prisma/client";

const MAX = 50 * 1024 * 1024;

export function classifyUpload(
  filename: string,
  mime: string
): { type: AssetType; resourceType: "image" | "video" | "raw" } | null {
  const lower = filename.toLowerCase();
  if (/\.(jpe?g|png|gif|webp)$/i.test(lower) || mime.startsWith("image/")) {
    return { type: "IMAGE", resourceType: "image" };
  }
  if (/\.(mp4|mov)$/i.test(lower) || mime.startsWith("video/")) {
    return { type: "VIDEO", resourceType: "video" };
  }
  if (/\.mp3$/i.test(lower) || mime === "audio/mpeg" || mime === "audio/mp3") {
    return { type: "AUDIO", resourceType: "raw" };
  }
  if (/\.pdf$/i.test(lower) || mime === "application/pdf") {
    return { type: "PDF", resourceType: "raw" };
  }
  return null;
}

export { MAX as MAX_UPLOAD_BYTES };
