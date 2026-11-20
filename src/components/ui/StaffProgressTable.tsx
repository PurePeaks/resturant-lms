"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

interface ModuleProgress {
  moduleId: string;
  moduleTitle: string;
  watchedSeconds: number;
  durationSeconds: number;
  completed: boolean;
  percent: number;
}

interface QuizAttemptRecord {
  moduleId: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface CertificateRecord {
  moduleId: string;
  pdfUrl: string;
  issuedAt: string;
  expiresAt: string | null;
  status: "valid" | "expired" | "revoked";
}

interface StaffProgressItem {
  userId: string;
  name: string;
  email: string;
  progress: ModuleProgress[];
  quizAttempts: QuizAttemptRecord[];
  certificates: CertificateRecord[];
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            percent >= 80 ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-neutral-400">{percent}%</span>
    </div>
  );
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function StaffProgressTable() {
  const [staffData, setStaffData] = useState<StaffProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "PENDING">("ALL");
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/progress/all", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Could not load progress (error ${res.status})`);
        return;
      }
      const data: StaffProgressItem[] = await res.json();
      setStaffData(data);
      setLastRefresh(new Date().toLocaleTimeString());
      setError("");
    } catch {
      setError("Could not load progress. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(fetchProgress, 0);
    const interval = setInterval(fetchProgress, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [fetchProgress]);

  const [offboardingId, setOffboardingId] = useState<string | null>(null);

  const handleResetProgress = async (userId: string, name: string) => {
    if (!confirm(`Reset training for ${name}? Their certificates will be revoked and they must watch the video and pass the quiz again. The history is kept in the activity log.`)) {
      return;
    }

    setResettingId(userId);
    try {
      const res = await fetch("/api/manager/staff/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reset progress");
      await fetchProgress();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setResettingId(null);
    }
  };

  const handleOffboardStaff = async (userId: string, name: string) => {
    if (
      !confirm(
        `Offboard "${name}"? They will no longer be able to sign in. Their training records and certificates are kept for compliance.`
      )
    ) {
      return;
    }

    setOffboardingId(userId);
    try {
      const res = await fetch(`/api/manager/staff/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to offboard staff member");
      await fetchProgress();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setOffboardingId(null);
    }
  };

  const handleResetPassword = async (userId: string, name: string) => {
    if (!confirm(`Reset the password for ${name}? They will be signed out everywhere and must choose a new password.`)) {
      return;
    }

    try {
      const res = await fetch("/api/manager/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      alert(
        data.temporaryPassword
          ? `Password reset for ${name}.\n\nTemporary password (shown once): ${data.temporaryPassword}\n\nThey must choose a new password when they sign in.`
          : data.message
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportCSV = () => {
    window.location.href = "/api/manager/export/compliance";
  };

  const filteredStaff = useMemo(() => {
    return staffData.filter((s) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      // 2. Status Filter
      const latestProgress = s.progress[0];
      const percent = latestProgress?.percent ?? 0;
      const status =
        !latestProgress || percent === 0
          ? "PENDING"
          : latestProgress.completed
          ? "COMPLETED"
          : "IN_PROGRESS";

      if (statusFilter === "ALL") return true;
      return status === statusFilter;
    });
  }, [staffData, searchQuery, statusFilter]);

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-xl space-y-0">
      {/* Table Toolbar Header */}
      <div className="border-b border-neutral-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Staff Progress & Accreditation Roster
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Real-time compliance monitoring, high-water mark validation, and certificate archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Compliance CSV
          </button>

          <button
            onClick={fetchProgress}
            title="Refresh records"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:text-white transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{lastRefresh ? lastRefresh : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border-b border-neutral-800/80 bg-neutral-950/40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(["ALL", "COMPLETED", "IN_PROGRESS", "PENDING"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === tab
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800/60 text-neutral-400 hover:text-white"
              }`}
            >
              {tab === "ALL"
                ? "All Staff"
                : tab === "COMPLETED"
                ? "Certified"
                : tab === "IN_PROGRESS"
                ? "In Progress"
                : "Pending"}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
          />
          <svg
            className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-950/30 border-b border-red-900/30 text-xs text-red-400">
          Sync error: {error}
        </div>
      )}

      {loading && staffData.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500">
          Syncing team records from Neon Postgres...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500">
          No team records matching current filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 bg-neutral-950/50">
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Curriculum Module</th>
                <th className="px-6 py-3.5">Watch Progress</th>
                <th className="px-6 py-3.5">Watch Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Score</th>
                <th className="px-6 py-3.5">Certificate</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => {
                const latestProgress = staff.progress[0];
                const latestQuiz = staff.quizAttempts[0];
                const certificate = staff.certificates[0];

                const percent = latestProgress?.percent ?? 0;
                const statusLabel: "Pending" | "In Progress" | "Completed" =
                  !latestProgress || percent === 0
                    ? "Pending"
                    : latestProgress.completed
                    ? "Completed"
                    : "In Progress";

                return (
                  <tr
                    key={staff.userId}
                    className="border-b border-neutral-800/40 last:border-0 hover:bg-neutral-800/30 transition"
                  >
                    {/* Name & Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 border border-neutral-700/60 text-xs font-semibold text-neutral-200">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{staff.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{staff.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Module Title */}
                    <td className="px-6 py-4 text-neutral-300 text-xs">
                      {latestProgress?.moduleTitle ?? "Food Safety Protocols"}
                    </td>

                    {/* Progress Bar */}
                    <td className="px-6 py-4">
                      <ProgressBar percent={percent} />
                    </td>

                    {/* Time Watched */}
                    <td className="px-6 py-4 text-xs text-neutral-400 tabular-nums">
                      {latestProgress ? (
                        <>
                          <span className="text-white font-medium">{fmt(latestProgress.watchedSeconds)}</span>
                          <span className="text-neutral-600"> / {fmt(latestProgress.durationSeconds || 38)}</span>
                        </>
                      ) : (
                        <span className="text-neutral-600">0m 00s</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={statusLabel} />
                    </td>

                    {/* Quiz Score */}
                    <td className="px-6 py-4 text-xs">
                      {latestQuiz ? (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            latestQuiz.passed ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {latestQuiz.score}%
                          {latestQuiz.passed && (
                            <span className="text-[10px] text-emerald-500 font-normal">Passed</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Certificate Link */}
                    <td className="px-6 py-4 text-xs">
                      {certificate?.pdfUrl ? (
                        <a
                          href={certificate.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            certificate.status === "expired"
                              ? "bg-amber-950/80 border border-amber-500/30 text-amber-300 hover:bg-amber-900/60"
                              : "bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 hover:text-white"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {certificate.status === "expired" ? "Expired" : "View PDF"}
                        </a>
                      ) : latestQuiz?.passed ? (
                        <span className="text-xs text-neutral-400">Processing...</span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Actions: Password Reset / Re-assign / Offboard */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(staff.userId, staff.name)}
                          title="Issue a new temporary password"
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-400 hover:border-amber-500/40 hover:text-amber-300 transition"
                        >
                          Password
                        </button>
                        <button
                          onClick={() => handleResetProgress(staff.userId, staff.name)}
                          disabled={resettingId === staff.userId}
                          title="Revoke certificates so this person must redo their training"
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-400 hover:border-neutral-700 hover:text-white transition disabled:opacity-50"
                        >
                          {resettingId === staff.userId ? "Resetting..." : "Re-assign"}
                        </button>
                        <button
                          onClick={() => handleOffboardStaff(staff.userId, staff.name)}
                          disabled={offboardingId === staff.userId}
                          title="Remove sign-in access; training records are kept"
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-red-400/80 hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-300 transition disabled:opacity-50"
                        >
                          {offboardingId === staff.userId ? "Offboarding..." : "Offboard"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
