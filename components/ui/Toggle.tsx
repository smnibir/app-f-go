"use client";

import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onCheckedChange,
  id,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4">
      <label htmlFor={id} className="text-base font-medium text-navy">
        {label}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full bg-gray-200 data-[state=checked]:bg-navy",
          disabled && "opacity-50"
        )}
      >
        <Switch.Thumb className="block h-7 w-7 translate-x-0.5 rounded-full bg-white shadow transition will-change-transform data-[state=checked]:translate-x-[26px]" />
      </Switch.Root>
    </div>
  );
}
