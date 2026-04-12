import { v2 as cloudinary } from "cloudinary";

export function configureCloudinary() {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) return false;
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
  return true;
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: "image" | "video" | "raw") {
  if (!configureCloudinary()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };
