import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { signLoginHandoffToken } from "@/lib/impersonate-token";
import { rateLimitAuth, getClientIp } from "@/lib/rate-limit";
import { rotateVerificationTokenAndEmail } from "@/lib/verification-email";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimitAuth(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Your account has been suspended. Please contact support." },
      { status: 403 }
    );
  }
  if (!user.emailVerified) {
    const sent = await rotateVerificationTokenAndEmail(user.id);
    return NextResponse.json(
      {
        error: "Please verify your email before signing in.",
        code: "EMAIL_NOT_VERIFIED",
        verificationSent: sent,
      },
      { status: 403 }
    );
  }
  const handoff = signLoginHandoffToken(user.id);
  return NextResponse.json({ handoffToken: handoff });
}
