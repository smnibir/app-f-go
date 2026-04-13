"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toaster";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "signin" | "register";

type AuthSubmitting = null | "signin" | "register" | "forgot" | "reset";

const inputAuth =
  "min-h-[52px] rounded-xl border-0 bg-gray-100 px-4 text-base text-gray-900 placeholder:text-gray-400 shadow-inner transition-all duration-300 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-accent/35";

const btnPrimary =
  "w-full rounded-full bg-gradient-to-r from-navy to-accent py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:shadow-xl hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const btnGhost =
  "rounded-full border-2 border-white bg-transparent px-10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition duration-300 hover:scale-105 hover:bg-white/15 active:scale-95";

function CardLogo({ logoUrl, appName }: { logoUrl: string; appName: string }) {
  if (logoUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl.trim()}
        alt=""
        className="h-auto max-h-[44px] w-auto object-contain drop-shadow-sm"
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
  const [showPwSignIn, setShowPwSignIn] = useState(false);
  const [showPwReg, setShowPwReg] = useState(false);
  const [showPwReset, setShowPwReset] = useState(false);
  const [submitting, setSubmitting] = useState<AuthSubmitting>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const isRegister = tab === "register";

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting("signin");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Could not sign in.";
        toast({
          title: "Couldn’t sign in",
          description: msg,
          variant: "destructive",
        });
        setSubmitting(null);
        return;
      }
      const handoff = data.handoffToken as string;
      const sign = await signIn("login-handoff", { token: handoff, redirect: false });
      if (sign?.error) {
        toast({
          title: "Session error",
          description: "Could not start your session. Try again.",
          variant: "destructive",
        });
        setSubmitting(null);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      toast({
        title: "Something went wrong",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
      setSubmitting(null);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting("register");
    try {
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
        const msg = typeof data.error === "string" ? data.error : "Registration failed.";
        toast({ title: "Couldn’t create account", description: msg, variant: "destructive" });
        setSubmitting(null);
        return;
      }
      toast({
        title: "Check your email",
        description: "We sent a verification link. You can sign in after verifying.",
      });
      setTab("signin");
      setSubmitting(null);
    } catch {
      toast({
        title: "Something went wrong",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
      setSubmitting(null);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Enter your email",
        description: "Add your email above, then tap Forgot your password again.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting("forgot");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      toast({
        title: "Request received",
        description: data.message || "If an account exists, you will get an email.",
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Could not send the request. Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) return;
    setSubmitting("reset");
    try {
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
      if (!res.ok) {
        toast({
          title: "Couldn’t update password",
          description: typeof data.error === "string" ? data.error : "Try again or request a new link.",
          variant: "destructive",
        });
        setSubmitting(null);
        return;
      }
      toast({ title: "Password updated", description: "You can sign in now." });
      window.location.href = "/";
    } catch {
      toast({
        title: "Something went wrong",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
      setSubmitting(null);
    }
  }

  const pwRules = {
    len: regPw.length >= 8,
    up: /[A-Z]/.test(regPw),
    num: /[0-9]/.test(regPw),
    spec: /[^A-Za-z0-9]/.test(regPw),
  };
  const ruleCount = [pwRules.len, pwRules.up, pwRules.num, pwRules.spec].filter(Boolean).length;
  const strength =
    !regPw ? 0
    : ruleCount <= 1 ? 1
    : ruleCount <= 3 ? 2
    : 3;

  const alerts = (
    <>
      {verified === "success" ?
        <div
          className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-base text-green-800 motion-safe:transition motion-safe:duration-500"
          role="status"
        >
          Your email is verified. You can sign in.
        </div>
      : null}
      {verified === "error" ?
        <div
          className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 motion-safe:transition motion-safe:duration-300"
          role="alert"
        >
          Verification link is invalid or expired.
        </div>
      : null}
    </>
  );

  const signInFormInner = (
    <form onSubmit={onSignIn} className="flex w-full max-w-sm flex-col gap-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-gray-800">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className={inputAuth}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-gray-800">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPwSignIn ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={cn(inputAuth, "pr-12")}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-lg text-accent transition hover:scale-110 active:scale-95"
            onClick={() => setShowPwSignIn((s) => !s)}
            aria-label={showPwSignIn ? "Hide password" : "Show password"}
          >
            {showPwSignIn ?
              <EyeOff className="h-5 w-5" />
            : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <div className="text-center">
        <button
          type="button"
          className="text-sm font-semibold text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-accent disabled:opacity-50"
          onClick={onForgot}
          disabled={submitting !== null}
        >
          {submitting === "forgot" ? "Sending…" : "Forgot your password?"}
        </button>
      </div>
      <button
        type="submit"
        className={cn(btnPrimary, "inline-flex items-center justify-center gap-2")}
        disabled={submitting !== null}
        aria-busy={submitting === "signin"}
      >
        {submitting === "signin" ?
          <>
            <LoadingSpinner className="h-5 w-5 border-2 border-white/35 border-t-white" />
            <span>Signing in…</span>
          </>
        : "Sign in"}
      </button>
    </form>
  );

  const registerFormInner = (
    <form onSubmit={onRegister} className="flex w-full max-w-sm flex-col gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-800">Full name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required className={inputAuth} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-800">Email</label>
        <Input
          type="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          required
          className={inputAuth}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-800">Password</label>
        <div className="relative">
          <Input
            type={showPwReg ? "text" : "password"}
            value={regPw}
            onChange={(e) => setRegPw(e.target.value)}
            className={cn(inputAuth, "pr-12")}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-lg text-accent transition hover:scale-110"
            onClick={() => setShowPwReg((s) => !s)}
            aria-label="Toggle password visibility"
          >
            {showPwReg ?
              <EyeOff className="h-5 w-5" />
            : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-accent to-navy transition-[width] duration-300 ease-out"
              style={{ width: `${(ruleCount / 4) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">
            Strength:{" "}
            <span className="font-semibold text-navy">
              {strength <= 1 ? "Weak" : strength === 2 ? "Fair" : "Strong"}
            </span>
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-800">Confirm password</label>
        <Input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          required
          className={inputAuth}
        />
      </div>
      <button
        type="submit"
        className={cn(btnPrimary, "mt-1 inline-flex items-center justify-center gap-2")}
        disabled={submitting !== null}
        aria-busy={submitting === "register"}
      >
        {submitting === "register" ?
          <>
            <LoadingSpinner className="h-5 w-5 border-2 border-white/35 border-t-white" />
            <span>Creating account…</span>
          </>
        : "Create account"}
      </button>
    </form>
  );

  const overlayCtaSignIn = (
    <div className="flex w-full flex-col items-center gap-4 px-4 text-center sm:px-8">
      <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md md:text-4xl">
        Welcome back!
      </h2>
      <p className="text-sm leading-relaxed text-white/90">
        Already have an account? Sign in to continue your journey with us.
      </p>
      <button type="button" className={btnGhost} onClick={() => setTab("signin")}>
        Sign in
      </button>
    </div>
  );

  const overlayCtaRegister = (
    <div className="flex w-full flex-col items-center gap-4 px-4 text-center sm:px-8">
      <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md md:text-4xl">
        Hello, friend!
      </h2>
      <p className="text-sm leading-relaxed text-white/90">
        Enter your personal details and start your journey with us.
      </p>
      <button type="button" className={btnGhost} onClick={() => setTab("register")}>
        Sign up
      </button>
    </div>
  );

  if (resetToken) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f0f2f5] px-4 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-navy/10 blur-3xl motion-safe:animate-pulse" />
          <div className="absolute -right-10 bottom-10 h-96 w-96 rounded-full bg-accent/15 blur-3xl motion-safe:animate-pulse motion-safe:[animation-delay:1s]" />
        </div>
        <div className="animate-auth-card-enter relative mx-auto flex max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative hidden min-h-[420px] w-2/5 bg-gradient-to-br from-navy via-blue-600 to-accent animate-auth-gradient md:flex md:flex-col md:items-center md:justify-center md:px-4">
            <div className="animate-auth-float text-center text-white">
              <p className="text-lg font-semibold opacity-90">Secure reset</p>
              <p className="mt-2 text-sm text-white/80">Choose a strong new password</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center p-8 md:p-10">
            <div className="mb-6 flex justify-center md:justify-start">
              <CardLogo logoUrl={logoUrl} appName={appName} />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-navy">Set a new password</h1>
            <p className="mb-6 text-sm text-gray-500">Your link is valid for a limited time.</p>
            <form onSubmit={onReset} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">New password</label>
                <div className="relative">
                  <Input
                    type={showPwReset ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={cn(inputAuth, "pr-12")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] text-accent"
                    onClick={() => setShowPwReset((s) => !s)}
                    aria-label={showPwReset ? "Hide password" : "Show password"}
                  >
                    {showPwReset ?
                      <EyeOff className="h-5 w-5" />
                    : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">Confirm password</label>
                <Input
                  type="password"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputAuth}
                />
              </div>
              <button
                type="submit"
                className={cn(btnPrimary, "inline-flex items-center justify-center gap-2")}
                disabled={submitting !== null}
                aria-busy={submitting === "reset"}
              >
                {submitting === "reset" ?
                  <>
                    <LoadingSpinner className="h-5 w-5 border-2 border-white/35 border-t-white" />
                    <span>Updating…</span>
                  </>
                : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f2f5] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-navy/12 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/14 blur-3xl motion-safe:animate-pulse motion-safe:[animation-delay:1.2s]" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="animate-auth-logo mb-8 flex w-full flex-col items-center justify-center text-center">
          <div className="mx-auto flex flex-col items-center">
            <CardLogo logoUrl={logoUrl} appName={appName} />
            <p className="mt-3 w-full text-center text-sm text-gray-500 motion-safe:transition motion-safe:duration-700">
              Your personal life timeline
            </p>
          </div>
        </div>

        <div className="mx-auto mb-6 max-w-xl">{alerts}</div>

        {/* Desktop: sliding gradient panel */}
        <div
          className="animate-auth-card-enter relative mx-auto hidden min-h-[min(560px,75vh)] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.2)] md:block"
        >
          <div className="absolute inset-0 flex">
            <div
              className="relative z-10 flex w-1/2 flex-col items-center justify-center bg-white px-8 py-10 lg:px-14"
              aria-hidden={isRegister}
            >
              <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 motion-safe:transition motion-safe:duration-500">
                Sign in
              </h2>
              {signInFormInner}
            </div>
            <div
              className="relative z-10 flex w-1/2 flex-col items-center justify-center bg-white px-8 py-10 lg:px-14"
              aria-hidden={!isRegister}
            >
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-gray-900">Create account</h2>
              <div className="max-h-[min(420px,50vh)] w-full overflow-y-auto pr-1">
                {registerFormInner}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "absolute left-0 top-0 z-20 flex h-full w-1/2 flex-col items-center justify-center overflow-hidden px-8 shadow-[0_0_40px_rgba(0,0,0,0.12)]",
              "bg-gradient-to-br from-navy via-blue-600 to-accent animate-auth-gradient",
              "transition-transform duration-[700ms] ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform",
              "motion-reduce:transition-none",
              isRegister ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-1/4 top-0 h-72 w-72 rounded-full bg-white/15 blur-3xl motion-safe:animate-pulse" />
              <div className="absolute -bottom-8 right-0 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
            </div>
            <div key={tab} className="animate-auth-overlay-text relative z-10 w-full">
              {isRegister ? overlayCtaSignIn : overlayCtaRegister}
            </div>
          </div>
        </div>

        {/* Mobile: stacked CTA + form swap */}
        <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl md:hidden">
          <div className="relative min-h-[200px] bg-gradient-to-br from-navy via-blue-600 to-accent px-6 py-10 transition-all duration-500 ease-out">
            <div key={tab} className="animate-auth-overlay-text">
              {isRegister ? overlayCtaSignIn : overlayCtaRegister}
            </div>
          </div>
          <div className="px-6 py-8">
            <div key={tab} className="animate-auth-form-swap">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                {isRegister ? "Create account" : "Sign in"}
              </h2>
              {isRegister ?
                <div className="max-h-[55vh] overflow-y-auto pr-1">{registerFormInner}</div>
              : signInFormInner}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
