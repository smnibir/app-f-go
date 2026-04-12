import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="text-base font-medium text-gray-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-navy">Page not found</h1>
      <p className="mt-3 max-w-md text-base text-gray-600">
        This address is not part of FutureGo. Check the URL, or return to the home page.
      </p>
      <Link
        href="/"
        className="mt-10 min-h-[48px] min-w-[200px] rounded-xl bg-navy px-8 py-3 text-base font-semibold text-white"
      >
        Go to home
      </Link>
    </div>
  );
}
