import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timelineEntryCreateSchema } from "@/lib/validations";
import { z } from "zod";
import { EntryStatus } from "@prisma/client";

const filterSchema = z.enum(["all", "past", "present", "upcoming"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const filter = filterSchema.safeParse(url.searchParams.get("filter") || "all");
  const f = filter.success ? filter.data : "all";
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const base = {
    userId: session.user.id,
    status: { in: ["PUBLISHED", "SCHEDULED", "DRAFT"] as EntryStatus[] },
  };

  let dateWhere: object = {};
  if (f === "past") {
    dateWhere = { entryDate: { lt: startOfDay } };
  } else if (f === "present") {
    dateWhere = { entryDate: { gte: startOfDay, lte: endOfDay } };
  } else if (f === "upcoming") {
    dateWhere = { entryDate: { gt: endOfDay } };
  }

  const entries = await prisma.timelineEntry.findMany({
    where: { ...base, ...dateWhere },
    include: { assets: true },
    orderBy: { entryDate: "asc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = timelineEntryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const entryDate = new Date(data.entryDate);
  let status: EntryStatus;
  let publishAt: Date | null = null;

  if (data.status === "DRAFT") {
    status = "DRAFT";
  } else if (data.publishImmediately) {
    status = "PUBLISHED";
    publishAt = new Date();
  } else if (data.publishAt) {
    publishAt = new Date(data.publishAt);
    status = publishAt > new Date() ? "SCHEDULED" : "PUBLISHED";
  } else {
    status = "PUBLISHED";
    publishAt = new Date();
  }

  const assets = data.assets ?? [];

  const entry = await prisma.timelineEntry.create({
    data: {
      userId: session.user.id,
      title: data.title,
      description: data.description || null,
      entryDate,
      publishAt,
      status,
      assets: {
        create: assets.map((a) => ({
          url: a.url,
          publicId: a.publicId,
          type: a.type,
          filename: a.filename,
          size: a.size ?? null,
        })),
      },
    },
    include: { assets: true },
  });

  return NextResponse.json({ entry });
}
