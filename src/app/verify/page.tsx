"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type CertStatus = "valid" | "expired" | "revoked";

interface VerifiedCert {
  code: string;
  status: CertStatus;
  statusReason: string | null;
  issuedAt: string;
  expiresAt: string | null;
  pdfUrl: string;
  recipientName: string;
  venueName: string;
  courseTitle: string;
  score: number | null;
  passingThreshold: number;
}

type Lookup = { cert: VerifiedCert | null; error: string | null };

async function lookupCertificate(code: string): Promise<Lookup> {
  try {
    const res = await fetch(`/api/verify?code=${encodeURIComponent(code)}`);
    const json = await res.json();
    if (!res.ok || !json.certificate) {
      return { cert: null, error: json.error || "No certificate matches this code." };
    }
    return { cert: json.certificate, error: null };
  } catch {
    return { cert: null, error: "Failed to verify certificate. Please try again." };
  }
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const STATUS_UI: Record<CertStatus, { label: string; heading: string; tone: string; border: string }> = {
  valid: {
    label: "Certificate Verified",
    heading: "Genuine and current",
    tone: "text-emerald-400 bg-emerald-950 border-emerald-500/50",
    border: "border-emerald-500/40 from-emerald-950/20",
  },
  expired: {
    label: "Certificate Expired",
    heading: "Genuine, but no longer valid",
    tone: "text-amber-400 bg-amber-950 border-amber-500/50",
    border: "border-amber-500/40 from-amber-950/20",
  },
  revoked: {
    label: "Certificate Revoked",
    heading: "Not valid",
    tone: "text-red-400 bg-red-950 border-red-500/50",
    border: "border-red-500/40 from-red-950/20",
  },
};

function VerifyContent() {
  const searchParams = useSearchParams();
  // `certId` and `id` are accepted for links printed before verification codes existed.
  const codeParam = searchParams.get("code") || searchParams.get("certId") || searchParams.get("id") || "";

  const [inputVal, setInputVal] = useState(codeParam);
  const [loading, setLoading] = useState(Boolean(codeParam));
  const [result, setResult] = useState<Lookup>({ cert: null, error: null });

  useEffect(() => {
    if (!codeParam) return;
    let ignore = false;
    lookupCertificate(codeParam).then((r) => {
      if (ignore) return;
      setResult(r);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [codeParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputVal.trim();
    if (!code) return;
    setLoading(true);
    setResult({ cert: null, error: null });
    setResult(await lookupCertificate(code));
    setLoading(false);
  };

  const data = result.cert;
  const ui = data ? STATUS_UI[data.status] : null;

  return (
    <div className="min-h-screen bg-black text-neutral-200 px-4 py-12 flex flex-col justify-between">
      <div className="mx-auto max-w-2xl w-full space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Platform Home</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Public Verification Portal
          </span>
        </div>

        {/* Verification Lookup Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Certificate Verification</h1>
          <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto">
            Check that a Himalayan Reserves training certificate is genuine and still valid. Enter the verification
            code printed on the certificate, or scan its QR code.
          </p>
        </div>

        {/* Search / Lookup Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="code" className="sr-only">
            Verification code
          </label>
          <input
            id="code"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. 5F32-A364-A879-41B9"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-3 text-xs md:text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500 font-mono transition"
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="shrink-0 rounded-2xl bg-blue-600 px-5 sm:px-6 py-3 text-xs md:text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 flex items-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span>Verify</span>
          </button>
        </form>

        {/* Error Notification */}
        {result.error && (
          <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/40 p-5 text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>No Matching Certificate</span>
            </div>
            <p className="text-xs text-red-300">{result.error}</p>
          </div>
        )}

        {/* Result Card */}
        {data && ui && (
          <div
            className={`rounded-3xl border bg-gradient-to-b via-neutral-900 to-neutral-950 p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden ${ui.border}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-md ${ui.tone}`}>
                  {data.status === "valid" ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className={`text-[11px] font-mono uppercase tracking-wider font-bold ${ui.tone.split(" ")[0]}`}>
                    {ui.label}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">{ui.heading}</h2>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Verification Code</span>
                <span className="font-mono text-xs text-neutral-300 font-bold">{data.code}</span>
              </div>
            </div>

            {data.status !== "valid" && (
              <p className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 text-xs text-neutral-300">
                {data.status === "expired" && data.expiresAt
                  ? `This certificate expired on ${longDate(data.expiresAt)}. The holder needs to renew their training.`
                  : `This certificate was revoked${data.statusReason ? `: ${data.statusReason}` : ""}.`}
              </p>
            )}

            {/* Recipient and Venue Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
                  Staff Member
                </span>
                <p className="text-base font-bold text-white">{data.recipientName}</p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
                  Venue
                </span>
                <p className="text-base font-bold text-white">{data.venueName}</p>
              </div>
            </div>

            {/* Curriculum & Score */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
                    Training Module
                  </span>
                  <p className="text-base font-bold text-white">{data.courseTitle}</p>
                </div>
                {data.score !== null && (
                  <div className="sm:text-right">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
                      Assessment Score
                    </span>
                    <div className="flex items-center sm:justify-end gap-2">
                      <span className="text-xl font-bold font-mono text-emerald-400">{data.score}%</span>
                      <span className="text-[10px] text-neutral-500">(Pass mark: {data.passingThreshold}%)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-800/80 text-xs text-neutral-400 flex flex-wrap gap-x-6 gap-y-1">
                <span>Issued: {longDate(data.issuedAt)}</span>
                <span>{data.expiresAt ? `Valid until: ${longDate(data.expiresAt)}` : "Does not expire"}</span>
              </div>
            </div>

            {/* Document Action Button */}
            <div className="pt-2 flex justify-center">
              <a
                href={data.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-6 py-3 text-xs font-semibold text-white transition shadow-lg"
              >
                <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>View Certificate</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-neutral-600">
        Himalayan Reserves &middot; Restaurant Training Programme
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-sm">
          Loading verification portal...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
