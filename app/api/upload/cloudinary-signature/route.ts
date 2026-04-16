import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary, configureCloudinaryWithSettings } from "@/lib/cloudinary";
import { classifyUpload, MAX_UPLOAD_BYTES } from "@/lib/asset-types";
import { cloudinaryPublicIdBaseFromFilename } from "@/lib/cloudinary-public-id";
import { getAppSettings } from "@/lib/settings";

/**
 * Returns signed params for **browser → Cloudinary** direct upload.
 * Avoids Vercel/server body limits (~4.5MB) that cause HTTP 413 for large videos.
 * The file never passes through this server — only this small JSON response does.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const mime = typeof body?.mime === "string" ? body.mime : "application/octet-stream";
  const purpose = typeof body?.purpose === "string" ? body.purpose : "timeline";
  const size = typeof body?.size === "number" ? body.size : 0;

  if (purpose === "branding" || purpose === "favicon") {
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File must be 50MB or smaller" }, { status: 400 });
  }

  const classified = classifyUpload(filename, mime);
  if (!classified) {
    return NextResponse.json(
      { error: "Allowed: JPG, PNG, MP4, MOV, MP3, PDF" },
      { status: 400 }
    );
  }

  if (purpose === "avatar" && classified.type !== "IMAGE") {
    return NextResponse.json({ error: "Profile photo must be an image" }, { status: 400 });
  }

  if (!(await configureCloudinaryWithSettings())) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 500 });
  }

  const s = await getAppSettings();
  const cloudName = (s.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = (s.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = (s.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 500 });
  }

  const folder =
    purpose === "avatar" ? "futurego/avatars"
    : purpose === "branding" || purpose === "favicon" ? "futurego/branding"
    : "futurego/timeline";

  const timestamp = Math.round(Date.now() / 1000);
  /**
   * Raw (PDF, MP3): set explicit `public_id` so the extension is kept on Cloudinary.
   * Image/video: `use_filename` + `unique_filename` (Cloudinary image public_ids usually omit ext).
   */
  const isRaw = classified.resourceType === "raw";
  const rawPublicId = isRaw ? cloudinaryPublicIdBaseFromFilename(filename) : "";
  const paramsToSign: Record<string, string | number> = isRaw ?
    {
      timestamp,
      folder,
      public_id: rawPublicId,
      unique_filename: "true",
    }
  : {
      timestamp,
      folder,
      use_filename: "true",
      unique_filename: "true",
    };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: classified.resourceType,
    assetType: classified.type,
    ...(isRaw ? { publicId: rawPublicId } : {}),
  });
}
