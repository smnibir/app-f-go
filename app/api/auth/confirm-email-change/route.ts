import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/dashboard/settings?email=error", req.url));
  }
  const user = await prisma.user.findFirst({
    where: {
      emailChangeToken: token,
      emailChangeExpiry: { gt: new Date() },
    },
  });
  if (!user?.pendingEmail) {
    return NextResponse.redirect(new URL("/dashboard/settings?email=error", req.url));
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpiry: null,
    },
  });
  return NextResponse.redirect(new URL("/dashboard/settings?email=ok", req.url));
}
