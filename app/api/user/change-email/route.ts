import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeEmailSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = changeEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }
  const newEmail = parsed.data.newEmail.toLowerCase();
  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken && taken.id !== user.id) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: newEmail,
      emailChangeToken: token,
      emailChangeExpiry: expiry,
    },
  });
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settings = await getAppSettings();
  await sendEmail({
    to: newEmail,
    templateKey: "verify_email",
    variables: {
      name: user.name || "there",
      link: `${base}/api/auth/confirm-email-change?token=${encodeURIComponent(token)}`,
      app_name: settings.app_name,
      logo_url: settings.logo_url || "",
    },
  });
  return NextResponse.json({ ok: true });
}
