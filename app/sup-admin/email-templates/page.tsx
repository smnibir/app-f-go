import { SupAdminEmailTemplatesPanel } from "@/components/sup-admin/SupAdminEmailTemplatesPanel";

export default function EmailTemplatesPage() {
  const dbConnected = !!process.env.DATABASE_URL?.trim();

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-navy">Email Templates</h1>
      <p className="mb-8 text-base text-gray-600">
        Edit subjects and HTML for each key. Placeholders use{" "}
        <code className="rounded bg-gray-100 px-1">{"{{variable}}"}</code> syntax. Changes apply to the
        next email send.
      </p>
      <SupAdminEmailTemplatesPanel dbConnected={dbConnected} />
    </div>
  );
}
