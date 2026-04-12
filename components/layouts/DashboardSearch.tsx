"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function DashboardSearch() {
  return (
    <div className="relative hidden min-w-0 flex-1 max-w-md md:block">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search"
        className="min-h-[48px] border-gray-200 bg-gray-50 pl-12 pr-4"
        aria-label="Search"
      />
    </div>
  );
}
