import type { AssetType } from "@prisma/client";
import { configureCloudinaryWithSettings, cloudinary } from "@/lib/cloudinary";

type AssetLike = { publicId: string; type: AssetType; url: string };

export function resourceTypeForAsset(t: AssetType): "image" | "video" | "raw" {
  switch (t) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    default:
      return "raw";
  }
}

export type CloudinaryDeliveryParts = {
  publicId: string;
  version: number;
  resourceType: "image" | "video" | "raw";
};

/**
 * Parse canonical delivery path from a stored secure_url.
 * Path: `https://res.cloudinary.com/{cloud}/(image|video|raw)/upload/v{version}/{public_id...}`
 */
export function parseCloudinaryDeliveryUrl(urlStr: string): CloudinaryDeliveryParts | null {
  try {
    const u = new URL(urlStr);
    if (!u.hostname.endsWith("cloudinary.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 5) return null;
    const resourceType = parts[1];
    if (resourceType !== "image" && resourceType !== "video" && resourceType !== "raw") {
      return null;
    }
    if (parts[2] !== "upload") return null;
    const vSeg = parts[3];
    if (!/^v\d+$/.test(vSeg)) return null;
    const version = parseInt(vSeg.slice(1), 10);
    const publicId = decodeURIComponent(parts.slice(4).join("/"));
    if (!publicId) return null;
    return { publicId, version, resourceType };
  } catch {
    return null;
  }
}

/**
 * Signed **CDN** URL (`res.cloudinary.com/.../s--…`) for browsers (img/video/audio).
 */
export async function buildSignedCloudinaryUrl(asset: AssetLike): Promise<string | null> {
  if (!asset.url.includes("res.cloudinary.com")) return null;
  if (!(await configureCloudinaryWithSettings())) return null;

  const parsed = parseCloudinaryDeliveryUrl(asset.url);
  const resourceType = parsed?.resourceType ?? resourceTypeForAsset(asset.type);
  const publicId = parsed?.publicId ?? asset.publicId;
  const version = parsed?.version;

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    resource_type: resourceType,
    type: "upload",
    urlAnalytics: false,
    ...(version != null ?
      { version, force_version: true }
    : { force_version: false }),
  });
}

/**
 * Authenticated **Admin API** download URL (`api.cloudinary.com/v1_1/.../raw/download?...`).
 * Use for **server-side** PDF streaming: CDN signed URLs often return **401** to non-browser fetches
 * when strict delivery is enabled; API downloads are signed with `api_key` + `signature` (upload API rules).
 */
export async function buildRawPrivateDownloadUrl(asset: AssetLike): Promise<string | null> {
  if (!asset.url.includes("res.cloudinary.com")) return null;
  if (!(await configureCloudinaryWithSettings())) return null;

  const parsed = parseCloudinaryDeliveryUrl(asset.url);
  const publicId = parsed?.publicId ?? asset.publicId;

  // Second arg is image `format`; omit for raw (SDK omits blank params from the signature).
  return cloudinary.utils.private_download_url(
    publicId,
    // @ts-expect-error Cloudinary allows omitting format for raw downloads
    undefined,
    {
      resource_type: "raw",
      type: "upload",
    }
  );
}
