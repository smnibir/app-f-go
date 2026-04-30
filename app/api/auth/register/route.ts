import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";
import { rateLimitAuth, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/verification-email";

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
  if (existing?.emailVerified) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const password = await bcrypt.hash(parsed.data.password, 12);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const settings = await getAppSettings();

  if (existing && !existing.emailVerified) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        password,
        verifyToken,
      },
    });
    await sendVerificationEmail({
      email,
      name: parsed.data.name,
      verifyToken,
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        password,
        role: "USER",
        verifyToken,
      },
    });

    await sendVerificationEmail({
      email,
      name: parsed.data.name,
      verifyToken,
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
  }

  return NextResponse.json({
    ok: true,
    verificationSent: true,
    resentToUnverified: Boolean(existing && !existing.emailVerified),
  });
}
