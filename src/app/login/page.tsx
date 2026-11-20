"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Seeded development accounts (see prisma/seed.ts). Defined only in development
// builds, so the passwords are stripped from the production bundle.
const DEMO_ACCOUNTS =
  process.env.NODE_ENV !== "production"
    ? [
        { role: "Super Admin", email: "info@pure-peaks.com", pass: "admin123" },
        { role: "Manager", email: "manager@restaurant-a.com", pass: "manager123" },
        { role: "Staff (John)", email: "john.doe@restaurant-a.com", pass: "staff123" },
        { role: "Staff (Jane)", email: "jane.smith@restaurant-a.com", pass: "staff123" },
      ]
    : [];

const SIGN_IN_ERRORS: Record<string, string> = {
  locked: "Too many failed attempts. Wait 15 minutes, or ask your manager to reset your password.",
  rate_limited: "Too many sign-in attempts from this network. Please wait a few minutes.",
};

const NOTICES: Record<string, string> = {
  session: "Your session has ended. Please sign in again.",
  "password-changed": "Password changed. Sign in with your new password.",
  "password-set": "Password set. Sign in with your new password.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const notice = NOTICES[useSearchParams().get("reason") ?? ""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fillAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(SIGN_IN_ERRORS[res.code ?? ""] ?? "Invalid email or password. Please verify credentials.");
        setLoading(false);
        return;
      }

      // Fetch authenticated session to determine role routing
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (session?.user?.mustChangePassword) {
        router.push("/change-password");
      } else if (role === "SUPER_ADMIN") {
        router.push("/dashboard/super-admin");
      } else if (role === "MANAGER") {
        router.push("/dashboard/manager");
      } else if (role === "STAFF") {
        router.push("/dashboard/staff");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred during authentication.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Back to Home Navigation Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-neutral-400 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Himalayan Reserves</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <Link href="/" className="inline-block group mb-3">
            <Image
              src="/logo-mark.png"
              alt="Himalayan Reserves"
              width={438}
              height={148}
              priority
              className="mx-auto h-7 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Restaurant Portal</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Sign in to access culinary modules and compliance certification
          </p>
        </div>

        {/* Demo Fast Login Pills (Development & Testing only) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-center">
              Development Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillAccount(acc.email, acc.pass)}
                  className="rounded-xl border border-neutral-800 bg-neutral-800/80 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:border-indigo-500 hover:bg-neutral-800 hover:text-white transition text-center truncate"
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-7 shadow-xl"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="name@restaurant.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {notice && !error && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
              {notice}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 shadow-lg shadow-indigo-600/30"
          >
            {loading ? "Verifying Credentials..." : "Sign In to Portal"}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-xs text-neutral-400 hover:text-white transition-colors">
              Forgot your password?
            </Link>
          </div>
        </form>

        {/* Back to Home bottom link */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-neutral-400 hover:text-rose-300 transition-colors inline-flex items-center gap-1"
          >
            <span>Looking for our artisan salt slabs?</span>
            <span className="font-semibold text-white hover:underline">Return to Home &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
