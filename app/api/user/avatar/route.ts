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
      { message: "Invalid avatar URL" }
    )
);

const schema = z.object({
  avatarUrl: urlString,
  avatarPublicId: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const prev = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true },
    });

    if (prev?.avatarPublicId && prev.avatarPublicId !== parsed.data.avatarPublicId) {
      try {
        await deleteCloudinaryAsset(prev.avatarPublicId, "image");
      } catch {
        /* ignore */
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: parsed.data.avatarUrl,
        avatarPublicId: parsed.data.avatarPublicId,
      },
      select: { avatarUrl: true, avatarPublicId: true },
    });

    return NextResponse.json({
      ok: true,
      avatarUrl: updated.avatarUrl,
      avatarPublicId: updated.avatarPublicId,
    });
  } catch (e) {
    console.error("[avatar PATCH]", e);
    return NextResponse.json({ error: "Could not save avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPublicId: true },
  });

  if (prev?.avatarPublicId) {
    try {
      await deleteCloudinaryAsset(prev.avatarPublicId, "image");
    } catch {
      /* ignore */
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null, avatarPublicId: null },
  });

  return NextResponse.json({ ok: true });
}
