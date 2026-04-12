import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/?verified=error", req.url));
  }
  const user = await prisma.user.findFirst({ where: { verifyToken: token } });
  if (!user) {
    return NextResponse.redirect(new URL("/?verified=error", req.url));
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null },
  });
  return NextResponse.redirect(new URL("/?verified=true", req.url));
}

export async function GET(req: Request) {
  return POST(req);
}
