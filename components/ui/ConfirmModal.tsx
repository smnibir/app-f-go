"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
  destructive,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <p className="mb-6 text-base text-gray-700">{message}</p>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="button"
          variant={destructive ? "danger" : "primary"}
          disabled={loading}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
