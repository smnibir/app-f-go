export default function SupAdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-navy">App Settings</h1>
      <p className="text-base text-gray-600">
        Branding and SendGrid settings are stored in <code className="rounded bg-gray-100 px-1">AppSettings</code>.
        Implement uploads and masked keys using <code className="rounded bg-gray-100 px-1">/api/sup-admin/settings</code>.
      </p>
    </div>
  );
}
