import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";

const urlString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string()
    .min(1)
    .refine(
      (s) => {
        try {
          const u = new URL(s);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Invalid URL" }
    )
);

const patchSchema = z.object({
  dialCoverUrl: urlString.optional(),
  dialCoverPublicId: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)).optional(),
  dialCoverPosX: z.number().int().min(0).max(100).optional(),
  dialCoverPosY: z.number().int().min(0).max(100).optional(),
  dialCoverZoom: z.number().int().min(50).max(200).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const hasUrl = d.dialCoverUrl !== undefined;
  const hasPid = d.dialCoverPublicId !== undefined;
  if (hasUrl !== hasPid) {
    return NextResponse.json(
      { error: "dialCoverUrl and dialCoverPublicId must be sent together" },
      { status: 400 }
    );
  }
  const hasNewImage = hasUrl && hasPid;

  if (
    !hasNewImage &&
    d.dialCoverPosX === undefined &&
    d.dialCoverPosY === undefined &&
    d.dialCoverZoom === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const prev = await prisma.user.findUnique({
      where: { id: userId },
      select: { dialCoverPublicId: true },
    });

    if (hasNewImage && prev?.dialCoverPublicId && prev.dialCoverPublicId !== d.dialCoverPublicId) {
      try {
        await deleteCloudinaryAsset(prev.dialCoverPublicId, "image");
      } catch {
        /* ignore */
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(hasNewImage && d.dialCoverUrl && d.dialCoverPublicId ?
          { dialCoverUrl: d.dialCoverUrl, dialCoverPublicId: d.dialCoverPublicId }
        : {}),
        ...(d.dialCoverPosX !== undefined ? { dialCoverPosX: d.dialCoverPosX } : {}),
        ...(d.dialCoverPosY !== undefined ? { dialCoverPosY: d.dialCoverPosY } : {}),
        ...(d.dialCoverZoom !== undefined ? { dialCoverZoom: d.dialCoverZoom } : {}),
      },
      select: {
        dialCoverUrl: true,
        dialCoverPublicId: true,
        dialCoverPosX: true,
        dialCoverPosY: true,
        dialCoverZoom: true,
      },
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    console.error("[dial-cover PATCH]", e);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dialCoverPublicId: true },
  });

  if (prev?.dialCoverPublicId) {
    try {
      await deleteCloudinaryAsset(prev.dialCoverPublicId, "image");
    } catch {
      /* ignore */
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      dialCoverUrl: null,
      dialCoverPublicId: null,
      dialCoverPosX: 50,
      dialCoverPosY: 50,
      dialCoverZoom: 100,
    },
  });

  return NextResponse.json({ ok: true });
}
