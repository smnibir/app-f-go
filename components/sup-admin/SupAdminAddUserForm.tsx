"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ActorRole = "ADMIN" | "SUPER_ADMIN";

export function SupAdminAddUserForm({
  actorRole,
  onCreated,
}: {
  actorRole: ActorRole;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [sendWelcome, setSendWelcome] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("ADMIN");
    setSendWelcome(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/sup-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          role,
          sendWelcomeEmail: sendWelcome,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Could not create user",
          description: typeof json.error === "string" ? json.error : "Try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "User created",
        description: `${json.user?.email ?? email} can sign in (email is pre-verified).`,
      });
      reset();
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const roleOptions: { value: typeof role; label: string }[] =
    actorRole === "SUPER_ADMIN" ?
      [
        { value: "USER", label: "User" },
        { value: "ADMIN", label: "Admin" },
        { value: "SUPER_ADMIN", label: "Super admin" },
      ]
    : [
        { value: "USER", label: "User" },
        { value: "ADMIN", label: "Admin" },
      ];

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">Add user</h2>
          <p className="text-sm text-gray-600">
            Create accounts with admin or user roles. New accounts are email-verified immediately.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Add user"}
        </Button>
      </div>

      {open ?
        <form onSubmit={onSubmit} className="mt-6 grid max-w-lg gap-4 border-t border-gray-100 pt-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="min-h-[48px]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-navy"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Initial password</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn("min-h-[48px] pr-12")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px]"
                onClick={() => setShowPw((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPw ?
                  <EyeOff className="h-5 w-5 text-gray-500" />
                : <Eye className="h-5 w-5 text-gray-500" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              8+ chars, uppercase, number, special character.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="min-h-[48px]"
              autoComplete="new-password"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="mt-1"
            />
            <span>
              Send welcome email with temporary password (uses SendGrid and the{" "}
              <code className="rounded bg-gray-100 px-1">welcome_user</code> template).
            </span>
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOpen(false); }}>
              Cancel
            </Button>
          </div>
        </form>
      : null}
    </div>
  );
}
