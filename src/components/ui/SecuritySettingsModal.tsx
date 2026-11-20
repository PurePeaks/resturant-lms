"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export default function SecuritySettingsModal({
  isOpen,
  onClose,
  userName = "User",
  userEmail = "",
  userRole = "STAFF",
}: SecuritySettingsModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      // Changing the password ends every session, including this one.
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=password-changed" });
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 border border-neutral-700">
                {userRole}
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">{userEmail}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security & Password</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Password updated. Signing you out so you can sign in with it...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Minimum 12 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Re-enter new password"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
