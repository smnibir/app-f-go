import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signImpersonationToken } from "@/lib/impersonate-token";

/**
 * Admin-only: returns a short-lived token + absolute URL to open the user’s dashboard as that user.
 * The link can be opened without an admin session; possession of the URL is the credential until expiry.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.status === "SUSPENDED") {
    return NextResponse.json({ error: "Cannot open a suspended account" }, { status: 400 });
  }

  const token = signImpersonationToken(session.user.id, target.id);

  await prisma.impersonationLog.create({
    data: { adminId: session.user.id, userId: target.id },
  });

  const origin = new URL(req.url).origin;
  const path = `/auth/impersonate?t=${encodeURIComponent(token)}`;
  const url = `${origin}${path}`;

  return NextResponse.json({ token, url });
}
