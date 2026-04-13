"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Layers, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

export type SupAdminUserDetail = {
  id: string;
  email: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { timeline: number };
};

export function SupAdminUserDetailForm({
  initialUser,
  actorRole,
  actorId,
}: {
  initialUser: SupAdminUserDetail;
  actorRole: "ADMIN" | "SUPER_ADMIN";
  actorId: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState(initialUser.name ?? "");
  const [role, setRole] = useState(initialUser.role);
  const [status, setStatus] = useState(initialUser.status);
  const [saving, setSaving] = useState(false);

  const isSelf = initialUser.id === actorId;
  const canSetSuperAdmin = actorRole === "SUPER_ADMIN";
  const verified = Boolean(initialUser.emailVerified);
  const joinedAt = format(new Date(initialUser.createdAt), "MMMM d, yyyy · h:mm a");
  const updatedAt = format(new Date(initialUser.updatedAt), "MMMM d, yyyy · h:mm a");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/sup-admin/users/${initialUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Could not save",
          description: typeof data.error === "string" ? data.error : "Try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "User updated" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/sup-admin/users"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {initialUser.avatarUrl ?
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initialUser.avatarUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full border border-gray-200 object-cover shadow-sm"
          />
        : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 text-2xl font-semibold text-gray-500 shadow-sm">
            {(name || initialUser.email).slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
            {name.trim() || initialUser.email}
          </h1>
          <p className="mt-1 text-[15px] text-gray-600">{initialUser.email}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            Account overview
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="divide-y divide-gray-100">
              <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:items-center">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 sm:mt-0">
                    {verified ?
                      <ShieldCheck className="h-[18px] w-[18px] text-emerald-600" aria-hidden />
                    : <ShieldOff className="h-[18px] w-[18px] text-amber-600" aria-hidden />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email verification</p>
                    <p className="mt-0.5 text-xs text-gray-500">Sign-in eligibility for this address</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                    verified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                  )}
                >
                  {verified ? "Verified" : "Not verified"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:items-center">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 sm:mt-0">
                    <Layers className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Timeline entries</p>
                    <p className="mt-0.5 text-xs text-gray-500">Events stored for this user</p>
                  </div>
                </div>
                <span className="shrink-0 text-lg font-semibold tabular-nums text-navy">
                  {initialUser._count.timeline}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:items-center">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 sm:mt-0">
                    <Calendar className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account created</p>
                    <p className="mt-0.5 text-xs text-gray-500">First registration timestamp</p>
                  </div>
                </div>
                <time
                  dateTime={initialUser.createdAt}
                  className="max-w-[min(100%,14rem)] shrink-0 text-right text-sm font-medium tabular-nums text-gray-900 sm:max-w-none"
                >
                  {joinedAt}
                </time>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:items-center">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 sm:mt-0">
                    <Clock className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile last updated</p>
                    <p className="mt-0.5 text-xs text-gray-500">Latest change to this record</p>
                  </div>
                </div>
                <time
                  dateTime={initialUser.updatedAt}
                  className="max-w-[min(100%,14rem)] shrink-0 text-right text-sm font-medium tabular-nums text-gray-900 sm:max-w-none"
                >
                  {updatedAt}
                </time>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            Account settings
          </h2>

          <form
            onSubmit={onSave}
            className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:max-w-none"
          >
            <div>
              <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-gray-700">
                Display name
              </label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[48px]"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="user-role"
                className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-navy"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                {canSetSuperAdmin ?
                  <option value="SUPER_ADMIN">Super admin</option>
                : null}
              </select>
              {!canSetSuperAdmin ?
                <p className="mt-1 text-xs text-gray-500">Only super admins can assign the super admin role.</p>
              : null}
            </div>

            <div>
              <label htmlFor="user-status" className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="user-status"
                className={cn(
                  "min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-navy",
                  isSelf && "opacity-60"
                )}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSelf}
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              {isSelf ?
                <p className="mt-1 text-xs text-gray-500">You cannot suspend your own account here.</p>
              : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving} className="!w-auto bg-navy hover:bg-navy/90">
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Link
                href="/sup-admin/users"
                className="inline-flex min-h-[48px] w-full min-w-[120px] items-center justify-center rounded-xl border-2 border-navy bg-white px-4 text-base font-semibold text-navy hover:bg-gray-50 sm:!w-auto"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
