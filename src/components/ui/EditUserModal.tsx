"use client";

import { useState } from "react";

type Role = "SUPER_ADMIN" | "MANAGER" | "STAFF";

export interface EditableUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
}

interface EditUserModalProps {
  user: EditableUser;
  tenants: { id: string; name: string; archivedAt?: string | null }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

const inputClass =
  "w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500";
const labelClass = "text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1";

/** Super admin: change a person's name, email, role or venue. */
export default function EditUserModal({ user, tenants, onClose, onSaved }: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [tenantId, setTenantId] = useState(user.tenantId ?? tenants.find((t) => !t.archivedAt)?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessChanging = role !== user.role || (role !== "SUPER_ADMIN" && tenantId !== user.tenantId) || email !== user.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, tenantId: role === "SUPER_ADMIN" ? null : tenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save changes.");
      onSaved(`Saved changes to ${name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <h2 id="edit-user-title" className="text-lg font-bold text-white tracking-tight">
            Edit {user.name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className={labelClass}>
              Full name
            </label>
            <input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="edit-email" className={labelClass}>
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-role" className={labelClass}>
                Role
              </label>
              <select id="edit-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </select>
            </div>

            {role !== "SUPER_ADMIN" && (
              <div>
                <label htmlFor="edit-venue" className={labelClass}>
                  Venue
                </label>
                <select id="edit-venue" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={inputClass}>
                  {tenants
                    .filter((t) => !t.archivedAt || t.id === user.tenantId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {accessChanging && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-200">
              Changing role, venue or email signs this person out everywhere.
            </p>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-700 px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
