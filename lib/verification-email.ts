import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";

export async function sendVerificationEmail(params: {
  email: string;
  name: string | null;
  verifyToken: string;
}) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settings = await getAppSettings();
  const verifyLink = `${base}/api/auth/verify-email?token=${encodeURIComponent(params.verifyToken)}`;

  await sendEmail({
    to: params.email,
    templateKey: "verify_email",
    variables: {
      name: params.name || "",
      link: verifyLink,
      app_name: settings.app_name,
      logo_url: settings.logo_url || "",
    },
  });
}

/** Persist a fresh token and send mail. Returns false if the user is missing or already verified. */
export async function rotateVerificationTokenAndEmail(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!row || row.emailVerified) return false;

  const verifyToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { verifyToken },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return false;

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verifyToken,
  });
  return true;
}
