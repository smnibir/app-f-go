import "./load-env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function emailShell(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f8f9fa;font-family:system-ui,sans-serif;font-size:16px;color:#374151;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;"><tr><td align="center">
<table width="600" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:left;">
<tr><td><img src="{{logo_url}}" alt="" style="max-height:48px;margin-bottom:16px;display:block;" />
<p style="font-family:Georgia,serif;font-size:22px;color:#1e3a5f;font-weight:bold;margin:0 0 16px;">{{app_name}}</p></td></tr>
<tr><td>${body}</td></tr>
<tr><td><p style="font-size:14px;color:#6b7280;margin-top:24px;">{{app_name}}</p></td></tr>
</table></td></tr></table></body></html>`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error(
      "\n[seed] DATABASE_URL is missing.\n" +
        "  Add it to .env or .env.local (see .env.example).\n" +
        "  Supabase: use the pooler URL (port 6543) with sslmode=require.\n"
    );
    process.exit(1);
  }

  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? "nibir@webgrowth.io").toLowerCase().trim();
  const passwordPlain = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Admin@123456";

  const password = await bcrypt.hash(passwordPlain, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
    update: {
      password,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  const settings = [
    { key: "app_name", value: "FutureGo" },
    { key: "sendgrid_api_key", value: "" },
    { key: "from_email", value: email },
    { key: "logo_url", value: "" },
    { key: "logo_public_id", value: "" },
  ];
  for (const s of settings) {
    await prisma.appSettings.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  const templates: { key: string; subject: string; htmlBody: string; variables: string }[] = [
    {
      key: "verify_email",
      subject: "Verify your email — {{app_name}}",
      htmlBody: emailShell(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi {{name}},</p>
<p>Please confirm your email for {{app_name}}.</p>
<p><a href="{{link}}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Verify email</a></p>`
      ),
      variables: "name, link, app_name, logo_url",
    },
    {
      key: "reset_password",
      subject: "Reset your password — {{app_name}}",
      htmlBody: emailShell(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi {{name}},</p>
<p>Reset your password using the button below.</p>
<p><a href="{{link}}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Reset password</a></p>`
      ),
      variables: "name, link, app_name, logo_url",
    },
    {
      key: "welcome_user",
      subject: "Welcome to {{app_name}}",
      htmlBody: emailShell(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi {{name}},</p>
<p>Your account is ready. Temporary password:</p>
<p style="padding:12px 16px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;">{{temp_password}}</p>
<p><a href="{{link}}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Open app</a></p>`
      ),
      variables: "name, temp_password, link, app_name, logo_url",
    },
    {
      key: "new_registration",
      subject: "New registration — {{app_name}}",
      htmlBody: emailShell(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">New user</p>
<p><strong>Name:</strong> {{name}}</p>
<p><strong>Email:</strong> {{email}}</p>`
      ),
      variables: "name, email, app_name, logo_url",
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      create: t,
      update: { subject: t.subject, htmlBody: t.htmlBody, variables: t.variables },
    });
  }

  console.log(`[seed] OK — super admin: ${email} (set SEED_SUPER_ADMIN_PASSWORD in prod)`);
}

main()
  .catch((e: Error & { code?: string }) => {
    console.error("\n[seed] Failed:", e.message);
    if (
      e.message?.includes("Can't reach database server") ||
      e.message?.includes("P1001") ||
      e.code === "P1001"
    ) {
      console.error(
        "\n  → Check DATABASE_URL (Supabase: use pooler :6543, ?sslmode=require&pgbouncer=true).\n" +
          "  → Ensure the DB is running / project not paused.\n"
      );
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
