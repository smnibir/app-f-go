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

type CloudinaryDeliveryParts = {
  publicId: string;
  version: number;
  resourceType: "image" | "video" | "raw";
};

/**
 * Parse canonical delivery path from a stored secure_url.
 * Prefer this over DB `publicId` alone — mismatches (encoding, suffix, folder) cause signed
 * URLs to point at the wrong object → Cloudinary "Not found" (common for raw/PDF).
 *
 * Path shape: `https://res.cloudinary.com/{cloud}/(image|video|raw)/upload/v{version}/{public_id...}`
 */
function parseCloudinaryDeliveryUrl(urlStr: string): CloudinaryDeliveryParts | null {
  try {
    const u = new URL(urlStr);
    if (!u.hostname.endsWith("cloudinary.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // [cloudName, image|video|raw, upload, vNNN, ...publicId]
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

  const parsed = parseCloudinaryDeliveryUrl(asset.url);
  const resourceType = parsed?.resourceType ?? resourceTypeForAsset(asset.type);
  const publicId = parsed?.publicId ?? asset.publicId;
  const version = parsed?.version;

  const url = cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    resource_type: resourceType,
    type: "upload",
    /** Appends `_a=`; can break strict signed delivery on some accounts. */
    urlAnalytics: false,
    ...(version != null ?
      { version, force_version: true }
    : { force_version: false }),
  });

  return NextResponse.json({ url });
}
