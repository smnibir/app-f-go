export default function SupAdminUsersPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-navy">Users</h1>
      <p className="text-base text-gray-600">
        User management UI is available via the API routes under{" "}
        <code className="rounded bg-gray-100 px-1">/api/sup-admin/users</code>. Connect{" "}
        <code className="rounded bg-gray-100 px-1">DATABASE_URL</code> and extend this page to list
        users with search and filters as specified.
      </p>
    </div>
  );
}
