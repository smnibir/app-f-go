"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [curPw, setCurPw] = useState("");
  const [curPwEmail, setCurPwEmail] = useState("");
  const [npw, setNpw] = useState("");
  const [npw2, setNpw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  useEffect(() => {
    if (params.get("email") === "ok") {
      toast({ title: "Email updated" });
    }
    if (params.get("email") === "error") {
      toast({ title: "Email change failed", variant: "destructive" });
    }
  }, [params, toast]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Could not save", variant: "destructive" });
      return;
    }
    await update();
    toast({ title: "Profile saved" });
  }

  async function sendEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/user/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword: curPwEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast({ title: data.error || "Could not start email change", variant: "destructive" });
      return;
    }
    toast({
      title: "Check your inbox",
      description: "We sent a link to confirm your new email.",
    });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: curPw,
        newPassword: npw,
        confirmPassword: npw2,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast({ title: data.error || "Could not update password", variant: "destructive" });
      return;
    }
    toast({ title: "Password updated" });
    setCurPw("");
    setNpw("");
    setNpw2("");
  }

  return (
    <div className="mx-auto max-w-xl space-y-12 px-4 py-10">
      <h1 className="text-3xl font-bold text-navy">Settings</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-navy">My Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-base font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium">Email</label>
            <Input value={email} disabled className="bg-gray-50" />
          </div>
          <Button type="submit" disabled={loading}>
            Save Changes
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-navy">Change Email</h2>
        <p className="mb-4 text-base text-gray-600">
          We&apos;ll send a link to your new email to confirm.
        </p>
        <form onSubmit={sendEmailChange} className="space-y-4">
          <div>
            <label className="mb-1 block text-base font-medium">New email</label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium">Current password</label>
            <Input
              type="password"
              value={curPwEmail}
              onChange={(e) => setCurPwEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            Send Verification
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-navy">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-base font-medium">Current password</label>
            <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium">New password</label>
            <Input type="password" value={npw} onChange={(e) => setNpw(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium">Confirm new password</label>
            <Input type="password" value={npw2} onChange={(e) => setNpw2(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            Update Password
          </Button>
        </form>
      </section>
    </div>
  );
}
