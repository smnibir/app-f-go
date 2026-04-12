import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/prisma";
import { getAppSettings, invalidateSettingsCache } from "@/lib/settings";

export type EmailVariables = Record<string, string>;

function applyTemplate(template: string, variables: EmailVariables): string {
  let out = template;
  for (const [k, v] of Object.entries(variables)) {
    const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
    out = out.replace(re, v ?? "");
  }
  return out;
}

function defaultHtmlWrapper(body: string, appName: string, logoUrl?: string) {
  const logo =
    logoUrl?.trim() ?
      `<img src="${logoUrl}" alt="" style="max-height:48px;margin-bottom:16px;" />`
    : `<p style="font-family:Georgia,serif;font-size:22px;color:#1e3a5f;font-weight:bold;margin:0 0 16px;">${appName}</p>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;background:#f8f9fa;font-family:system-ui,-apple-system,sans-serif;font-size:16px;color:#374151;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:left;">
<tr><td>${logo}</td></tr>
<tr><td style="padding-top:8px;">${body}</td></tr>
<tr><td style="padding-top:24px;font-size:14px;color:#6b7280;">${appName}</td></tr>
</table></td></tr></table></body></html>`;
}

const defaults: Record<
  string,
  { subject: string; html: (vars: EmailVariables) => string }
> = {
  verify_email: {
    subject: "Verify your email — {{app_name}}",
    html: (v) =>
      defaultHtmlWrapper(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi ${v.name || "there"},</p>
<p>Please confirm your email address for ${v.app_name}.</p>
<p><a href="${v.link}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Verify email</a></p>
<p style="font-size:14px;color:#6b7280;">If you did not create an account, you can ignore this message.</p>`,
        v.app_name,
        v.logo_url
      ),
  },
  reset_password: {
    subject: "Reset your password — {{app_name}}",
    html: (v) =>
      defaultHtmlWrapper(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi ${v.name || "there"},</p>
<p>We received a request to reset your password.</p>
<p><a href="${v.link}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Reset password</a></p>
<p style="font-size:14px;color:#6b7280;">This link expires in one hour.</p>`,
        v.app_name,
        v.logo_url
      ),
  },
  welcome_user: {
    subject: "Welcome to {{app_name}}",
    html: (v) =>
      defaultHtmlWrapper(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">Hi ${v.name || "there"},</p>
<p>Your account is ready. You can sign in with the temporary password below, then change it in settings.</p>
<p style="font-size:16px;padding:12px 16px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;"><strong>Temporary password:</strong> ${v.temp_password}</p>
<p><a href="${v.link}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">Open ${v.app_name}</a></p>`,
        v.app_name,
        v.logo_url
      ),
  },
  new_registration: {
    subject: "New registration — {{app_name}}",
    html: (v) =>
      defaultHtmlWrapper(
        `<p style="font-size:18px;color:#1e3a5f;font-weight:600;">New user registered</p>
<p><strong>Name:</strong> ${v.name}</p>
<p><strong>Email:</strong> ${v.email}</p>`,
        v.app_name,
        v.logo_url
      ),
  },
};

export async function sendEmail(opts: {
  to: string;
  templateKey: keyof typeof defaults | string;
  variables: EmailVariables;
}) {
  const settings = await getAppSettings();
  const key = opts.templateKey as string;
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  const def = defaults[key];
  let subject = def ? applyTemplate(def.subject, opts.variables) : "";
  let htmlBody = def ? def.html(opts.variables) : defaultHtmlWrapper("<p>Notification</p>", settings.app_name);

  if (row) {
    subject = applyTemplate(row.subject, opts.variables);
    htmlBody = applyTemplate(row.htmlBody, opts.variables);
  }

  const apiKey = settings.sendgrid_api_key || process.env.SENDGRID_API_KEY || "";
  const from = settings.from_email || process.env.SENDGRID_FROM_EMAIL || "noreply@localhost";

  if (!apiKey) {
    console.warn("sendEmail: no SendGrid API key configured; skipping send to", opts.to);
    return { skipped: true as const };
  }

  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to: opts.to,
    from,
    subject,
    html: htmlBody,
  });
  return { skipped: false as const };
}
