"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex w-full min-h-[48px] items-center justify-center rounded-xl px-4 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" && "bg-navy text-white hover:bg-[#162d4a]",
          variant === "secondary" &&
            "border-2 border-navy bg-white text-navy hover:bg-gray-50",
          variant === "ghost" && "w-auto border border-transparent bg-transparent text-navy hover:bg-gray-100",
          variant === "danger" && "border-2 border-red-600 bg-white text-red-700 hover:bg-red-50",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
