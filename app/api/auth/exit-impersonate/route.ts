import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signExitImpersonationToken } from "@/lib/impersonate-token";

export async function POST() {
  const session = await auth();
  const adminId = session?.user?.impersonatingFrom;
  if (!adminId) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }
  const token = signExitImpersonationToken(adminId);
  return NextResponse.json({ token });
}
