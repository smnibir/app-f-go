import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSignedCloudinaryUrl } from "@/lib/cloudinary-timeline-delivery";

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

  const url = await buildSignedCloudinaryUrl(asset);
  if (!url) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
