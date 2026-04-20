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
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-4 md:py-4 py-3">
          <Link href="/dashboard" className="flex min-h-[48px] shrink-0 items-center">
            <AppLogo />
          </Link>
          <div className="hidden" aria-hidden>
            <DashboardSearch />
          </div>
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
