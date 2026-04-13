import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { AdminLayoutClient } from "@/components/layouts/AdminLayoutClient";

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const email = session.user.email ?? "";
  const branding = await getAppSettings();

  return (
    <AdminLayoutClient userEmail={email} appName={branding.app_name} logoUrl={branding.logo_url || ""}>
      {children}
    </AdminLayoutClient>
  );
}
