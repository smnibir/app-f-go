import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppLogo } from "@/components/AppLogo";
import { DashboardHeaderMenu } from "@/components/layouts/DashboardHeaderMenu";
import { ExitImpersonationButton } from "@/components/layouts/ExitImpersonationButton";
import { DashboardSearch } from "@/components/layouts/DashboardSearch";

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:py-4">
          <Link href="/dashboard" className="flex min-h-[48px] shrink-0 items-center">
            <AppLogo />
          </Link>
          <DashboardSearch />
          <DashboardHeaderMenu user={session.user} />
        </div>
      </header>
      {session.user.impersonatingFrom ?
        <ExitImpersonationButton name={session.user.name || session.user.email || "User"} />
      : null}
      <main>{children}</main>
    </div>
  );
}
