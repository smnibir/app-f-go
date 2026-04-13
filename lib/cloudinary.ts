import { v2 as cloudinary } from "cloudinary";
import { getAppSettings } from "@/lib/settings";

function applyConfig(name: string, key: string, secret: string) {
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
}

/** Sync: environment variables only. */
export function configureCloudinary(): boolean {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) return false;
  applyConfig(name, key, secret);
  return true;
}

/** Prefer values from App Settings (admin UI), then fall back to env. */
export async function configureCloudinaryWithSettings(): Promise<boolean> {
  const s = await getAppSettings();
  const name = (s.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const key = (s.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || "").trim();
  const secret = (s.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!name || !key || !secret) return false;
  applyConfig(name, key, secret);
  return true;
}

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video" | "raw"
) {
  const ok = await configureCloudinaryWithSettings();
  if (!ok) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };
