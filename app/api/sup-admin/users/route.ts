import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/sup-admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.error === "Unauthorized" ? 401 : 403 }
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ users: [] });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where:
      q ?
        {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { timeline: true } } },
  });
  return NextResponse.json({ users });
}
