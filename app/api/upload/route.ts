import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { configureCloudinaryWithSettings, cloudinary } from "@/lib/cloudinary";
import { classifyUpload, MAX_UPLOAD_BYTES } from "@/lib/asset-types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const purpose = (form.get("purpose") as string | null) || "timeline";

  if (purpose === "branding" || purpose === "favicon") {
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!(await configureCloudinaryWithSettings())) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 500 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File must be 50MB or smaller" }, { status: 400 });
  }

  const classified = classifyUpload(file.name, file.type || "application/octet-stream");
  if (!classified) {
    return NextResponse.json(
      { error: "Allowed: JPG, PNG, MP4, MOV, MP3, PDF" },
      { status: 400 }
    );
  }

  if (purpose === "avatar" && classified.type !== "IMAGE") {
    return NextResponse.json({ error: "Profile photo must be an image" }, { status: 400 });
  }

  if (purpose === "branding" && classified.type !== "IMAGE") {
    return NextResponse.json({ error: "Logo must be an image (JPG or PNG)" }, { status: 400 });
  }

  if (purpose === "favicon" && classified.type !== "IMAGE") {
    return NextResponse.json(
      { error: "Favicon must be an image (PNG, JPG, WebP, GIF, or ICO)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder =
    purpose === "avatar" ? "futurego/avatars"
    : purpose === "branding" || purpose === "favicon" ? "futurego/branding"
    : "futurego/timeline";

  const uploadOptions: Record<string, string | boolean> = {
    folder,
    resource_type: classified.resourceType,
    use_filename: true,
    unique_filename: true,
  };

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes?: number;
  }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(uploadOptions, (err, res) => {
        if (err || !res) reject(err || new Error("upload failed"));
        else resolve(res as { secure_url: string; public_id: string; bytes?: number });
      })
      .end(buffer);
  });

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    type: classified.type,
    filename: file.name,
    size: result.bytes ?? file.size,
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const publicId = url.searchParams.get("publicId");
  if (!publicId) {
    return NextResponse.json({ error: "publicId required" }, { status: 400 });
  }
  if (!(await configureCloudinaryWithSettings())) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
  return NextResponse.json({ ok: true });
}
