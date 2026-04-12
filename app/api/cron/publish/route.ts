import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization");
  const ok =
    secret &&
    (secret === process.env.CRON_SECRET || secret === `Bearer ${process.env.CRON_SECRET}`);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ published: 0, message: "No database" });
  }
  const now = new Date();
  const res = await prisma.timelineEntry.updateMany({
    where: { status: "SCHEDULED", publishAt: { lte: now } },
    data: { status: "PUBLISHED" },
  });
  return NextResponse.json({ published: res.count });
}
