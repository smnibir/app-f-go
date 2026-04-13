"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SupAdminAddUserForm } from "@/components/sup-admin/SupAdminAddUserForm";

export type SupAdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  emailVerified: string | null;
  createdAt: string;
  _count: { timeline: number };
};

type Props = {
  initialUsers: SupAdminUserRow[];
  initialTotal: number;
  initialSkip: number;
  initialTake: number;
  dbConnected: boolean;
  /** When true, first client sync is skipped (SSR or no DB). */
  skipInitialFetch: boolean;
  actorRole: "ADMIN" | "SUPER_ADMIN";
};

export function SupAdminUsersPanel({
  initialUsers,
  initialTotal,
  initialSkip,
  initialTake,
  dbConnected,
  skipInitialFetch,
  actorRole,
}: Props) {
  const take = initialTake;
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [skip, setSkip] = useState(initialSkip);

  const [users, setUsers] = useState<SupAdminUserRow[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncOnce = useRef(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    params.set("skip", String(skip));
    params.set("take", String(take));
    const res = await fetch(`/api/sup-admin/users?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load users.");
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setTotal(typeof data.total === "number" ? data.total : 0);
    setLoading(false);
  }, [q, role, status, skip, take]);

  useEffect(() => {
    if (!dbConnected) return;

    if (!syncOnce.current) {
      syncOnce.current = true;
      if (skipInitialFetch) return;
      void fetchUsers();
      return;
    }

    const delay = q ? 300 : 0;
    const t = window.setTimeout(() => {
      void fetchUsers();
    }, delay);
    return () => window.clearTimeout(t);
  }, [q, role, status, skip, fetchUsers, dbConnected, skipInitialFetch]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  const pageIndex = Math.floor(skip / take) + 1;

  if (!dbConnected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-base text-amber-900">
        Connect <code className="rounded bg-white px-1">DATABASE_URL</code> in your environment to
        load users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SupAdminAddUserForm actorRole={actorRole} onCreated={() => void fetchUsers()} />

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="user-search" className="mb-1 block text-sm font-medium text-gray-700">
            Search
          </label>
          <Input
            id="user-search"
            type="search"
            placeholder="Email or name"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSkip(0);
            }}
            autoComplete="off"
          />
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="filter-role" className="mb-1 block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="filter-role"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-navy"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setSkip(0);
            }}
          >
            <option value="">All</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="filter-status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="filter-status"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 text-base text-navy"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSkip(0);
            }}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {error ?
        <p className="text-base text-red-600" role="alert">
          {error}
        </p>
      : null}

      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ?
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <LoadingSpinner />
          </div>
        : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <th className="py-3 pl-4 pr-3 font-semibold">Name</th>
                <th className="py-3 pr-3 font-semibold">Email</th>
                <th className="py-3 pr-3 font-semibold">Role</th>
                <th className="py-3 pr-3 font-semibold">Status</th>
                <th className="py-3 pr-3 font-semibold">Verified</th>
                <th className="py-3 pr-3 font-semibold">Entries</th>
                <th className="py-3 pr-3 font-semibold">Joined</th>
                <th className="py-3 pr-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ?
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No users match your filters.
                  </td>
                </tr>
              : users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pl-4 pr-3">{u.name || "—"}</td>
                    <td className="py-3 pr-3">{u.email}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          u.status === "ACTIVE" ? "text-green-700" : "text-amber-800"
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{u.emailVerified ? "Yes" : "No"}</td>
                    <td className="py-3 pr-3">{u._count.timeline}</td>
                    <td className="whitespace-nowrap py-3 pr-3 text-gray-600">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {actorRole === "ADMIN" && u.role === "SUPER_ADMIN" ?
                        <span className="text-sm text-gray-400" title="Only a super admin can open this account">
                          —
                        </span>
                      : <Link
                          href={`/sup-admin/users/${u.id}`}
                          className="inline-flex min-h-[40px] items-center justify-end font-semibold text-navy hover:underline"
                        >
                          View / edit
                        </Link>
                      }
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {total > take ?
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-600">
            Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + take, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-navy disabled:opacity-40"
              disabled={skip <= 0 || loading}
              onClick={() => setSkip((s) => Math.max(0, s - take))}
            >
              Previous
            </button>
            <span className="flex min-h-[44px] items-center px-2 text-sm text-gray-600">
              Page {pageIndex} / {pageCount}
            </span>
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-navy disabled:opacity-40"
              disabled={skip + take >= total || loading}
              onClick={() => setSkip((s) => s + take)}
            >
              Next
            </button>
          </div>
        </div>
      : null}
    </div>
  );
}
