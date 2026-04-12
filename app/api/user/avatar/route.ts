import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { configureCloudinary, deleteCloudinaryAsset, cloudinary } from "@/lib/cloudinary";

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

  if (prev?.avatarPublicId && configureCloudinary()) {
    try {
      await cloudinary.uploader.destroy(prev.avatarPublicId, { resource_type: "image" });
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
