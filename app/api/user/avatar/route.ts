import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";

const schema = z.object({
  avatarUrl: z.string().url(),
  avatarPublicId: z.string().min(1),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
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
    data: {
      avatarUrl: parsed.data.avatarUrl,
      avatarPublicId: parsed.data.avatarPublicId,
    },
  });

  return NextResponse.json({ ok: true });
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
