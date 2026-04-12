import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timelineEntryPatchSchema } from "@/lib/validations";
import { configureCloudinary, cloudinary } from "@/lib/cloudinary";
import type { EntryStatus } from "@prisma/client";

async function destroyAssets(assets: { publicId: string; type: string }[]) {
  if (!configureCloudinary()) return;
  for (const a of assets) {
    const rt =
      a.type === "IMAGE" ? "image"
      : a.type === "VIDEO" ? "video"
      : "raw";
    try {
      await cloudinary.uploader.destroy(a.publicId, { resource_type: rt });
    } catch {
      /* ignore */
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const entry = await prisma.timelineEntry.findFirst({
    where: { id, userId: session.user.id },
    include: { assets: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.timelineEntry.findFirst({
    where: { id, userId: session.user.id },
    include: { assets: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = timelineEntryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const entryDate = data.entryDate ? new Date(data.entryDate) : existing.entryDate;

  let status: EntryStatus = existing.status;
  let publishAt: Date | null = existing.publishAt;

  if (data.status === "DRAFT") {
    status = "DRAFT";
    publishAt = null;
  } else if (data.publishImmediately !== undefined || data.publishAt !== undefined) {
    if (data.publishImmediately) {
      status = "PUBLISHED";
      publishAt = new Date();
    } else if (data.publishAt) {
      publishAt = new Date(data.publishAt);
      status = publishAt > new Date() ? "SCHEDULED" : "PUBLISHED";
    }
  } else if (data.status) {
    status = data.status as EntryStatus;
  }

  const removedAssetIds = data.removedAssetIds;
  const newAssets = data.newAssets;

  if (removedAssetIds?.length) {
    const toRemove = existing.assets.filter((a) => removedAssetIds.includes(a.id));
    await destroyAssets(toRemove);
    await prisma.asset.deleteMany({
      where: { id: { in: removedAssetIds }, timelineEntryId: id },
    });
  }

  const entry = await prisma.timelineEntry.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      entryDate,
      publishAt,
      status,
      ...(newAssets?.length ?
        {
          assets: {
            create: newAssets.map((a) => ({
              url: a.url,
              publicId: a.publicId,
              type: a.type,
              filename: a.filename,
              size: a.size ?? null,
            })),
          },
        }
      : {}),
    },
    include: { assets: true },
  });

  return NextResponse.json({ entry });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.timelineEntry.findFirst({
    where: { id, userId: session.user.id },
    include: { assets: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await destroyAssets(existing.assets);
  await prisma.timelineEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
