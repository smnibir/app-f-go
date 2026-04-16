import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSignedCloudinaryUrl } from "@/lib/cloudinary-timeline-delivery";

function safeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 200) || "document.pdf";
}

/**
 * Same-origin PDF stream so the browser opens `/api/media/pdf?...` instead of `res.cloudinary.com/...`.
 * Avoids Chrome `chrome-error://chromewebdata` + cross-origin frame restrictions on raw PDF delivery.
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
      type: "PDF",
      timelineEntry: { userId: session.user.id },
    },
    select: { publicId: true, type: true, url: true, filename: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = safeFilename(asset.filename || "document.pdf");

  if (!asset.url.includes("res.cloudinary.com")) {
    return NextResponse.redirect(asset.url, 302);
  }

  const signedUrl = await buildSignedCloudinaryUrl(asset);
  if (!signedUrl) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(signedUrl, {
    ...(range ? { headers: { Range: range } } : {}),
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: "Could not load PDF" },
      { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 }
    );
  }

  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  headers.set("Content-Type", ct || "application/pdf");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  const cr = upstream.headers.get("content-range");
  if (cr) headers.set("Content-Range", cr);
  const ar = upstream.headers.get("accept-ranges");
  if (ar) headers.set("Accept-Ranges", ar);
  headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
