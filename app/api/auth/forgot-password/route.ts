import { NextResponse } from "next/server";
import crypto from "crypto";
import { forgotPasswordSchema } from "@/lib/validations";
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
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const settings = await getAppSettings();
    const link = `${base}/?reset=${encodeURIComponent(resetToken)}`;
    await sendEmail({
      to: email,
      templateKey: "reset_password",
      variables: {
        name: user.name || "there",
        link,
        app_name: settings.app_name,
        logo_url: settings.logo_url || "",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we sent reset instructions.",
  });
}
