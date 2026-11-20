"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell, { AuthMessage, authButtonClass, authInputClass, authLabelClass } from "@/components/ui/AuthShell";

const MIN_LENGTH = 12;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

// Landing page for emailed reset and invitation links.
function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_LENGTH) {
      setError(`Your password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not set your password.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set your password.");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <Link href="/login" className="text-xs text-neutral-400 hover:text-white transition-colors">
      &larr; Back to sign in
    </Link>
  );

  if (!token) {
    return (
      <AuthShell title="Link not valid" footer={backToLogin}>
        <AuthMessage tone="error">
          This page needs the link from your email. Request a new one from{" "}
          <Link href="/forgot-password" className="underline">
            Forgot password
          </Link>
          .
        </AuthMessage>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password set">
        <AuthMessage tone="success">Your new password is saved.</AuthMessage>
        <Link href="/login?reason=password-set" className={`${authButtonClass} block text-center`}>
          Sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" footer={backToLogin}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new" className={authLabelClass}>
            New password
          </label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={authInputClass}
            aria-describedby="new-hint"
          />
          <p id="new-hint" className="mt-1.5 text-[11px] text-neutral-500">
            At least {MIN_LENGTH} characters.
          </p>
        </div>

        <div>
          <label htmlFor="confirm" className={authLabelClass}>
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInputClass}
          />
        </div>

        {error && <AuthMessage tone="error">{error}</AuthMessage>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? "Saving..." : "Set password"}
        </button>
      </form>
    </AuthShell>
  );
}
