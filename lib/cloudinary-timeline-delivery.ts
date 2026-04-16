import type { AssetType } from "@prisma/client";
import { configureCloudinaryWithSettings, cloudinary } from "@/lib/cloudinary";

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

type AssetLike = { publicId: string; type: AssetType; url: string };

/**
 * Signed HTTPS URL for Cloudinary delivery (images/videos/audio/PDF when needed as direct URL).
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
