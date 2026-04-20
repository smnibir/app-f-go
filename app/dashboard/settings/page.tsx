"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import { useSearchParams } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { DialCoverProvider, useDialCover } from "@/components/DialCoverPanel";

type Profile = {
  name: string | null;
  email: string;
  address: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  dialCoverUrl: string | null;
  dialCoverPosX: number;
  dialCoverPosY: number;
  dialCoverZoom: number;
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

  function SettingsCoverHeader() {
    const { url, busy, pct, openFilePicker, onRemove } = useDialCover();
    return (
      <div className="overflow-hidden border-y border-gray-200 bg-white shadow-sm sm:rounded-2xl sm:border">
        <div className="relative h-[min(42vw,220px)] bg-slate-300 sm:h-[280px]">
          {url ?
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
            </>
          : <div className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#0a4d8c]/80 to-slate-500" />}

          <div className="absolute bottom-3 right-3 flex flex-wrap items-center justify-end gap-2 sm:bottom-4 sm:right-4">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-md ring-1 ring-black/10 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {busy ? `Uploading ${pct}%` : "Edit cover photo"}
            </button>
            {url ?
              <>
                <Link
                  href="/dashboard?adjustCover=1"
                  className="rounded-lg bg-black/50 px-3 py-2 text-sm font-medium text-white shadow-md backdrop-blur-md ring-1 ring-white/20 transition hover:bg-black/65"
                >
                  Reposition
                </Link>
                <button
                  type="button"
                  onClick={() => void onRemove()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-white/25 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Remove
                </button>
              </>
            : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-12 pt-0">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        {profile ?
          <DialCoverProvider
            initial={{
              url: profile.dialCoverUrl ?? null,
              posX: profile.dialCoverPosX ?? 50,
              posY: profile.dialCoverPosY ?? 50,
              zoom: profile.dialCoverZoom ?? 100,
            }}
          >
            <SettingsCoverHeader />

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-10">
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
                <ProfileAvatarUpload
                  variant="settings"
                  user={{
                    email,
                    name: session?.user?.name,
                    avatarUrl: displayAvatarUrl,
                  }}
                  displayName={name || session?.user?.name}
                  onAvatarSaved={(next) =>
                    setProfile((p) => (p ? { ...p, ...next } : p))
                  }
                />

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
          </DialCoverProvider>
        : null}
      </div>
    </div>
  );
}
