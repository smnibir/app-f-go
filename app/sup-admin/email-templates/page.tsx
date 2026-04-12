export default function EmailTemplatesPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-navy">Email Templates</h1>
      <p className="text-base text-gray-600">
        Template editor will load keys from the <code className="rounded bg-gray-100 px-1">EmailTemplate</code>{" "}
        table via <code className="rounded bg-gray-100 px-1">/api/sup-admin/email-templates</code>.
      </p>
    </div>
  );
}
