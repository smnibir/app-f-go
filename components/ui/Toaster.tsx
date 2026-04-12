"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ToastInput = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type Ctx = { toast: (t: ToastInput) => void };

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(ToastInput & { id: number }) | null>(null);

  const toast = useCallback((t: ToastInput) => {
    const id = Date.now();
    setCurrent({ ...t, id });
    window.setTimeout(() => setCurrent((c) => (c?.id === id ? null : c)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current ?
        <div
          role="alert"
          className={cn(
            "fixed bottom-6 right-6 z-[100] w-[min(100vw-2rem,400px)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg",
            current.variant === "destructive" && "border-red-200 bg-red-50"
          )}
        >
          <p className="text-base font-semibold text-gray-900">{current.title}</p>
          {current.description ?
            <p className="mt-1 text-base text-gray-700">{current.description}</p>
          : null}
        </div>
      : null}
    </ToastContext.Provider>
  );
}
