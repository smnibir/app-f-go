import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const nav = [
  { href: "/sup-admin", label: "Overview" },
  { href: "/sup-admin/users", label: "Users" },
  { href: "/sup-admin/email-templates", label: "Email Templates" },
  { href: "/sup-admin/settings", label: "Settings" },
];

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white px-4 py-8 md:block">
          <p className="mb-6 font-serif text-xl font-bold text-navy">Admin</p>
          <nav className="flex flex-col gap-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="min-h-[48px] rounded-lg px-3 py-3 text-base font-medium text-navy hover:bg-gray-50"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="mt-6 min-h-[48px] rounded-lg px-3 py-3 text-base font-semibold text-accent"
            >
              ← Back to App
            </Link>
          </nav>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-8">{children}</div>
      </div>
    </div>
  );
}
