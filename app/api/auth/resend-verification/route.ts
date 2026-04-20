import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";
import { rateLimitAuth, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimitAuth(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, name: true },
  });

  if (!user) {
    return NextResponse.json({
      ok: true,
      message: "If an account exists for this email, we sent a verification link.",
    });
  }

  if (user.emailVerified) {
    return NextResponse.json({
      ok: true,
      message: "This email is already verified. You can sign in.",
    });
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settings = await getAppSettings();

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken },
  });

  const verifyLink = `${base}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;

  await sendEmail({
    to: email,
    templateKey: "verify_email",
    variables: {
      name: user.name || "",
      link: verifyLink,
      app_name: settings.app_name,
      logo_url: settings.logo_url || "",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Check your inbox for a new verification link.",
  });
}
