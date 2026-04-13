"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { postFormDataWithProgress } from "@/lib/upload-xhr";

type Profile = {
  name: string | null;
  email: string;
  address: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
};

const sectionBox = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const params = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [curPw, setCurPw] = useState("");
  const [curPwEmail, setCurPwEmail] = useState("");
  const [npw, setNpw] = useState("");
  const [npw2, setNpw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUploadPct, setAvatarUploadPct] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok || cancelled) {
        if (!cancelled && res.status !== 401) {
          toast({ title: "Could not load profile", variant: "destructive" });
        }
        setProfileLoading(false);
        return;
      }
      const data = (await res.json()) as Profile;
      if (cancelled) return;
      setProfile(data);
      if (data.name) setName(data.name);
      setAddress(data.address || "");
      setPhone(data.phone || "");
      if (data.email) setEmail(data.email);
      setProfileLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

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
      body: JSON.stringify({
        name,
        address: address.trim() || null,
        phone: phone.trim() || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Could not save", variant: "destructive" });
      return;
    }
    await update();
    toast({ title: "Profile saved" });
  }

  async function onAvatarFile(file: File) {
    setAvatarBusy(true);
    setAvatarUploadPct(0);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("purpose", "avatar");
      const { ok, data } = await postFormDataWithProgress("/api/upload", fd, (pct) =>
        setAvatarUploadPct(pct)
      );
      const payload = data as { error?: string; url?: string; publicId?: string };
      if (!ok) {
        toast({
          title: "Upload failed",
          description: payload.error || "Try again.",
          variant: "destructive",
        });
        return;
      }
      const patch = await fetch("/api/user/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: payload.url, avatarPublicId: payload.publicId }),
      });
      if (!patch.ok) {
        toast({ title: "Could not save photo", variant: "destructive" });
        return;
      }
      setProfile((p) =>
        p ?
          { ...p, avatarUrl: payload.url!, avatarPublicId: payload.publicId! }
        : p
      );
      await update();
      toast({ title: "Photo updated" });
    } finally {
      setAvatarBusy(false);
      setAvatarUploadPct(null);
    }
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

  const displayAvatarUrl = profile?.avatarUrl ?? session?.user?.avatarUrl ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-10">
        <section
          className={cn(
            sectionBox,
            "flex flex-col lg:min-h-[min(100vh-10rem,720px)]"
          )}
        >
          {profileLoading ?
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-[#0056b3]" />
              <p className="text-sm text-gray-500">Loading profile…</p>
            </div>
          : <>
              <div className="mb-8 flex flex-col items-center gap-4 border-b border-gray-100 pb-8">
                <div className="relative mx-auto">
                  <div
                    className={cn(
                      "overflow-hidden rounded-full ring-2 ring-gray-100",
                      avatarBusy && "opacity-60"
                    )}
                  >
                    <Avatar
                      src={displayAvatarUrl}
                      name={name || session?.user?.name}
                      email={email}
                      size={96}
                    />
                  </div>
                  <label
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-[#0056b3] shadow-md transition hover:bg-gray-50",
                      avatarBusy && "pointer-events-none"
                    )}
                  >
                    <Camera className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={avatarBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void onAvatarFile(f);
                      }}
                    />
                    <span className="sr-only">Upload profile photo</span>
                  </label>
                </div>
                {avatarBusy && avatarUploadPct !== null ?
                  <div className="w-full max-w-[220px] px-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#0056b3] transition-[width] duration-150"
                        style={{ width: `${avatarUploadPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-600">
                      Uploading photo… {avatarUploadPct}%
                    </p>
                  </div>
                : null}
                <p className="text-center text-sm text-gray-500">Profile & contact details</p>
              </div>

              <form onSubmit={saveProfile} className="flex flex-1 flex-col space-y-5">
                <div>
                  <label className="mb-1 block text-base font-medium text-gray-800">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-base font-medium text-gray-800">Address</label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city, region, postal code…"
                    rows={3}
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-base font-medium text-gray-800">Phone number</label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-base font-medium text-gray-800">Email</label>
                  <Input value={email} disabled className="bg-gray-50" />
                </div>
                <div className="mt-auto pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0056b3] hover:bg-[#004a9c]"
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </>
          }
        </section>

        <div className="flex flex-col gap-8">
          <section className={sectionBox}>
            <h2 className="mb-2 text-lg font-bold text-[#0056b3]">Change email</h2>
            <p className="mb-6 text-base text-gray-600">
              We&apos;ll send a link to your new email to confirm.
            </p>
            <form onSubmit={sendEmailChange} className="space-y-4">
              <div>
                <label className="mb-1 block text-base font-medium text-gray-800">New email</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-base font-medium text-gray-800">
                  Current password
                </label>
                <Input
                  type="password"
                  value={curPwEmail}
                  onChange={(e) => setCurPwEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#0056b3] hover:bg-[#004a9c]"
              >
                Send verification
              </Button>
            </form>
          </section>

          <section className={sectionBox}>
            <h2 className="mb-6 text-lg font-bold text-[#0056b3]">Change password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-base font-medium text-gray-800">
                  Current password
                </label>
                <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-base font-medium text-gray-800">New password</label>
                <Input type="password" value={npw} onChange={(e) => setNpw(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-base font-medium text-gray-800">
                  Confirm new password
                </label>
                <Input type="password" value={npw2} onChange={(e) => setNpw2(e.target.value)} required />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#0056b3] hover:bg-[#004a9c]"
              >
                Update password
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
