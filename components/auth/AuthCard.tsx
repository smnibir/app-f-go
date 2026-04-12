"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { Eye, EyeOff } from "lucide-react";

type Tab = "signin" | "register";

function CardLogo({ logoUrl, appName }: { logoUrl: string; appName: string }) {
  if (logoUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl.trim()}
        alt=""
        className="h-auto max-h-[40px] w-auto object-contain"
      />
    );
  }
  return (
    <span className="font-sans text-2xl font-bold tracking-tight text-navy">
      {appName?.trim() || "FutureGo"}
    </span>
  );
}

export function AuthCard({
  verified,
  resetToken,
  logoUrl,
  appName,
}: {
  verified: "success" | "error" | null;
  resetToken: string | null;
  logoUrl: string;
  appName: string;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("signin");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Reset (when resetToken present)
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not sign in.");
      setLoading(false);
      return;
    }
    const handoff = data.handoffToken as string;
    const sign = await signIn("login-handoff", { token: handoff, redirect: false });
    if (sign?.error) {
      setErr("Could not start session. Try again.");
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: regEmail,
        password: regPw,
        confirmPassword: confirmPw,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Registration failed.");
      setLoading(false);
      return;
    }
    toast({
      title: "Check your email",
      description: "We sent a verification link. You can sign in after verifying.",
    });
    setTab("signin");
    setLoading(false);
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) {
      toast({
        title: "Enter your email",
        description: "Add your email above, then tap Forgot your password again.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const data = await res.json();
    toast({
      title: "Request received",
      description: data.message || "If an account exists, you will get an email.",
    });
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) return;
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        password: newPw,
        confirmPassword: newPw2,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(data.error || "Could not reset password.");
      return;
    }
    toast({ title: "Password updated", description: "You can sign in now." });
    window.location.href = "/";
  }

  const pwRules = {
    len: regPw.length >= 8,
    up: /[A-Z]/.test(regPw),
    num: /[0-9]/.test(regPw),
    spec: /[^A-Za-z0-9]/.test(regPw),
  };
  const strength =
    !regPw ? 0
    : [pwRules.len, pwRules.up, pwRules.num, pwRules.spec].filter(Boolean).length <= 1 ? 1
    : [pwRules.len, pwRules.up, pwRules.num, pwRules.spec].filter(Boolean).length <= 3 ? 2
    : 3;

  if (resetToken) {
    return (
      <div className="min-h-screen bg-surface px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <CardLogo logoUrl={logoUrl} appName={appName} />
          </div>
          <h1 className="mb-6 text-center text-2xl font-bold text-navy">Set a new password</h1>
          {err ?
            <p className="mb-4 text-base text-red-600" role="alert">
              {err}
            </p>
          : null}
          <form onSubmit={onReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">New password</label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">
                Confirm password
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-2 flex min-h-[40px] justify-center">
          <CardLogo logoUrl={logoUrl} appName={appName} />
        </div>
        <div className="mb-8 text-center text-[15px] text-gray-500">
          Your personal life timeline
        </div>

        {verified === "success" ?
          <div
            className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-base text-green-800"
            role="status"
          >
            Your email is verified. You can sign in.
          </div>
        : null}
        {verified === "error" ?
          <div
            className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800"
            role="alert"
          >
            Verification link is invalid or expired.
          </div>
        : null}

        <div className="mb-8 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`min-h-[48px] rounded-xl text-base font-semibold ${
              tab === "signin" ? "border-b-4 border-navy text-navy" : "text-gray-500"
            }`}
            onClick={() => {
              setTab("signin");
              setErr(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`min-h-[48px] rounded-xl text-base font-semibold ${
              tab === "register" ? "border-b-4 border-navy text-navy" : "text-gray-500"
            }`}
            onClick={() => {
              setTab("register");
              setErr(null);
            }}
          >
            Create Account
          </button>
        </div>

        {tab === "signin" ?
          <form onSubmit={onSignIn} className="space-y-4">
            {err ?
              <p className="text-base text-red-600" role="alert">
                {err}
              </p>
            : null}
            <div>
              <label htmlFor="email" className="mb-1 block text-base font-medium text-gray-800">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-base font-medium text-gray-800">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px]"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ?
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  : <Eye className="h-6 w-6 text-gray-500" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="min-h-[48px] text-base font-semibold text-accent underline"
              onClick={onForgot}
            >
              Forgot your password?
            </button>
            <Button type="submit" disabled={loading}>
              Sign In
            </Button>
            <button
              type="button"
              className="w-full min-h-[48px] text-base text-navy underline"
              onClick={() => setTab("register")}
            >
              New here? Create an account
            </button>
          </form>
        : <form onSubmit={onRegister} className="space-y-4">
            {err ?
              <p className="text-base text-red-600" role="alert">
                {err}
              </p>
            : null}
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">Full name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">Email</label>
              <Input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={regPw}
                  onChange={(e) => setRegPw(e.target.value)}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px]"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ?
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  : <Eye className="h-6 w-6 text-gray-500" />}
                </button>
              </div>
              <p className="mt-2 text-base text-gray-700">
                Strength:{" "}
                <span className="font-semibold">
                  {strength <= 1 ? "Weak" : strength === 2 ? "Fair" : "Strong"}
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-[15px] text-gray-600">
                <li>{pwRules.len ? "✓" : "○"} At least 8 characters</li>
                <li>{pwRules.up ? "✓" : "○"} One uppercase letter</li>
                <li>{pwRules.num ? "✓" : "○"} One number</li>
                <li>{pwRules.spec ? "✓" : "○"} One special character</li>
              </ul>
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-gray-800">
                Confirm password
              </label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              Create Account
            </Button>
          </form>
        }
      </div>
    </div>
  );
}
