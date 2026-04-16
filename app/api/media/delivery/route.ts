import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { configureCloudinaryWithSettings, cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import type { AssetType } from "@prisma/client";

function resourceTypeForAsset(t: AssetType): "image" | "video" | "raw" {
  switch (t) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    default:
      return "raw";
  }
}

/**
 * Signed Cloudinary delivery URL for timeline assets (strict / signed-URL accounts return 401 without this).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetId = new URL(req.url).searchParams.get("assetId");
  if (!assetId) {
    return NextResponse.json({ error: "assetId required" }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      timelineEntry: { userId: session.user.id },
    },
    select: { publicId: true, type: true, url: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!asset.url.includes("res.cloudinary.com")) {
    return NextResponse.json({ url: asset.url });
  }

  if (!(await configureCloudinaryWithSettings())) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const url = cloudinary.url(asset.publicId, {
    secure: true,
    sign_url: true,
    resource_type: resourceTypeForAsset(asset.type),
  });

  return NextResponse.json({ url });
}
