"use client";

import { useState } from "react";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded: () => void;
}

export default function InviteStaffModal({ isOpen, onClose, onStaffAdded }: InviteStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sign-in details shown once after the account is created.
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
    welcomeEmailSent: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCreated(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/manager/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to add staff member.");
      }

      setCreated({
        name: data.name,
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        welcomeEmailSent: Boolean(data.welcomeEmailSent),
      });
      setName("");
      setEmail("");
      setPassword("");
      onStaffAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding staff member");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Add Staff Member</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Create an account for new restaurant staff to access training.
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
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

        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 leading-relaxed">
              {created.name} has been added. Give them these sign-in details. They&apos;ll be asked to choose their own
              password the first time they sign in. This password won&apos;t be shown again.
              {created.welcomeEmailSent && (
                <> We also emailed them a link to set their own password, so they can sign in without it.</>
              )}
            </div>
            <dl className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Email</dt>
                <dd className="text-white break-all">{created.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Temporary password</dt>
                <dd className="font-mono text-amber-300 break-all select-all">{created.temporaryPassword}</dd>
              </div>
            </dl>
            <div className="flex justify-end border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marcus Miller"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marcus@restaurant-a.com"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="invite-password" className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Temporary Password <span className="normal-case font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="invite-password"
              type="text"
              autoComplete="off"
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to generate one"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 font-mono"
            />
            <p className="mt-1.5 text-[11px] text-neutral-500">
              At least 12 characters if you set one. They must change it when they first sign in.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-neutral-700 px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add to Team"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

