"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import AuthShell, { AuthMessage, authButtonClass, authInputClass, authLabelClass } from "@/components/ui/AuthShell";

const MIN_LENGTH = 12;

// Shown after sign-in when an account still has a temporary password
// (new accounts and manager resets). Nothing else in the portal works until
// the user picks their own password.
export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(`Your new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two new passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        await signOut({ callbackUrl: "/login?reason=session" });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not change your password.");

      // Every session ended with the password change; sign in again.
      await signOut({ callbackUrl: "/login?reason=password-changed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose your password"
      subtitle="You're signed in with a temporary password. Pick your own to continue."
      footer={
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          Sign out instead
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current" className={authLabelClass}>
            Temporary password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={authInputClass}
          />
        </div>

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
            At least {MIN_LENGTH} characters. A short sentence is easy to remember.
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
          {loading ? "Saving..." : "Save password"}
        </button>
      </form>
    </AuthShell>
  );
}
