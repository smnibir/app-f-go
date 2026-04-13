import { SupAdminSettingsForm } from "@/components/sup-admin/SupAdminSettingsForm";

export default function SupAdminSettingsPage() {
  const dbConnected = !!process.env.DATABASE_URL?.trim();

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-navy">App Settings</h1>
      <p className="mb-8 text-base text-gray-600">
        Branding (logo on Cloudinary), app name, and SendGrid credentials. API keys are stored in{" "}
        <code className="rounded bg-gray-100 px-1">AppSettings</code> and only masked values are shown
        after save.
      </p>
      <SupAdminSettingsForm dbConnected={dbConnected} />
    </div>
  );
}
