import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";
import { rateLimitAuth, getClientIp } from "@/lib/rate-limit";

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
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.confirmPassword?.[0] ||
      parsed.error.flatten().fieldErrors.password?.[0] ||
      "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const password = await bcrypt.hash(parsed.data.password, 12);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settings = await getAppSettings();

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      password,
      role: "USER",
      verifyToken,
    },
  });

  const verifyLink = `${base}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;

  await sendEmail({
    to: email,
    templateKey: "verify_email",
    variables: {
      name: parsed.data.name,
      link: verifyLink,
      app_name: settings.app_name,
      logo_url: settings.logo_url || "",
    },
  });

  await sendEmail({
    to: process.env.SUPER_ADMIN_EMAIL || "nibir@webgrowth.io",
    templateKey: "new_registration",
    variables: {
      name: parsed.data.name,
      email,
      app_name: settings.app_name,
      logo_url: settings.logo_url || "",
    },
  });

  return NextResponse.json({ ok: true });
}
