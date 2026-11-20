export const instant = false;

import { cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { findPublicCertificate } from "@/lib/certificates";
import { baseUrlFrom } from "@/lib/request";
import PrintCertificateButton from "@/components/ui/PrintCertificateButton";
import CertificateQrCode from "@/components/ui/CertificateQrCode";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getCertificate = cache((id: string) => findPublicCertificate(decodeURIComponent(id)));

const longDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cert = await getCertificate(id);

  if (!cert) {
    return { title: "Certificate Verification | Himalayan Reserves" };
  }

  return {
    title: `Training Certificate — ${cert.recipientName} | Himalayan Reserves`,
    description: `Himalayan Reserves training certificate for ${cert.recipientName} in ${cert.courseTitle}.`,
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params;
  const certificate = await getCertificate(id);

  if (!certificate) {
    notFound();
  }

  const { recipientName, courseTitle, venueName, score, code, status } = certificate;
  const certId = certificate.id;
  const baseUrl = baseUrlFrom(await headers());
  const verifyPath = `/verify?code=${encodeURIComponent(code)}`;
  const verifyUrl = `${baseUrl}${verifyPath}`;
  const dateIssued = longDate(certificate.issuedAt);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* ─── Top Control Bar (Hidden on Print) ────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/staff"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>

            {status === "valid" ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Valid certificate
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {status === "expired" ? "Expired" : "Revoked"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={verifyPath}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-xs text-neutral-400 transition hover:text-amber-400 md:inline-flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Verify on Public Portal</span>
            </Link>

            <PrintCertificateButton certId={certId} />
          </div>
        </div>
      </header>

      {/* ─── Not-valid warning (also printed) ─────────────────────────────── */}
      {status !== "valid" && (
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8">
          <div
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200 print:border-black print:bg-white print:text-black"
          >
            {status === "expired" && certificate.expiresAt
              ? `This certificate expired on ${longDate(certificate.expiresAt)} and is no longer valid.`
              : `This certificate has been revoked${certificate.statusReason ? ` (${certificate.statusReason})` : ""} and is no longer valid.`}
          </div>
        </div>
      )}

      {/* ─── Certificate Viewport Container ──────────────────────────────── */}
      <main className="mx-auto flex max-w-4xl flex-col items-center justify-center p-4 py-8 sm:p-8 sm:py-12 print:p-0">
        <div
          id="certificate-sheet"
          className="relative w-full max-w-[820px] rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#141416] via-[#0d0d0f] to-[#0a0a0c] p-8 text-white shadow-2xl shadow-black/80 sm:p-14 md:p-16 print:border-neutral-800 print:bg-white print:text-black print:shadow-none print:rounded-none"
        >
          {/* Subtle Inner Guilloche Border */}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border border-amber-500/20 sm:inset-5 print:border-neutral-400" />
          <div className="pointer-events-none absolute inset-4 rounded-xl border border-amber-500/10 sm:inset-6 print:border-neutral-300" />

          {/* Certificate Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Seal */}
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent shadow-inner print:border-neutral-800 print:bg-neutral-100">
              <svg className="h-7 w-7 text-amber-400 print:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>

            {/* Issuer Header */}
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400/90 print:text-neutral-700">
              Himalayan Reserves
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neutral-400 print:text-neutral-500">
              Restaurant Training Programme
            </p>

            {/* Certificate Title */}
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl print:text-black">
              Certificate of Completion
            </h1>

            <div className="my-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent print:via-neutral-400" />

            {/* Recipient Introduction */}
            <p className="text-xs uppercase tracking-wider text-neutral-400 print:text-neutral-600">
              This certifies that
            </p>

            {/* Recipient Full Name */}
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-amber-300 sm:text-3xl md:text-4xl print:text-black font-serif">
              {recipientName}
            </h2>

            {/* Certification Body Description */}
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-neutral-300 sm:text-sm print:text-neutral-700">
              watched the required training video and passed the assessment for
            </p>

            {/* Module Name Card */}
            <div className="mt-3 inline-block rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 print:border-neutral-300 print:bg-neutral-50">
              <span className="text-sm font-bold text-white sm:text-base print:text-black">
                {courseTitle}
              </span>
            </div>

            {/* Evaluation Score Pill */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold text-emerald-400 print:border-neutral-400 print:bg-neutral-100 print:text-black">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{score !== null ? `Assessment score: ${score}% (passed)` : "Assessment passed"}</span>
              </span>

              <span className="text-xs text-neutral-400 print:text-neutral-600">
                • Venue: <strong className="text-neutral-200 print:text-black">{venueName}</strong>
              </span>
            </div>

            {/* Divider & Credentials Footer */}
            <div className="mt-10 w-full border-t border-white/10 pt-6 print:border-neutral-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                {/* Text Metadata */}
                <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 print:text-neutral-500">
                      Date Issued
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-neutral-200 print:text-black">{dateIssued}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 print:text-neutral-500">
                      Valid Until
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-neutral-200 print:text-black">
                      {certificate.expiresAt ? longDate(certificate.expiresAt) : "No expiry"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 print:text-neutral-500">
                      Issued By
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-neutral-200 print:text-black">Himalayan Reserves</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 print:text-neutral-500">
                      Verification Code
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-medium text-amber-400 print:text-black break-all">
                      {code}
                    </p>
                  </div>
                </div>

                {/* Scannable Vector QR Code */}
                <div className="flex flex-col items-center sm:items-end shrink-0">
                  <CertificateQrCode value={verifyUrl} size={92} />
                  <span className="mt-1.5 text-[9px] font-medium tracking-wider uppercase text-neutral-400 print:text-neutral-600">
                    Scan to Verify
                  </span>
                </div>
              </div>
            </div>

            {/* Verification note */}
            <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[10px] text-neutral-500 print:border-neutral-200 print:text-neutral-500">
              <span>Check this certificate is genuine and current at:</span>
              <Link href={verifyPath} className="break-all hover:text-amber-400 transition">
                {verifyUrl}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Print Stylesheet ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, nav, .print\\:hidden {
            display: none !important;
          }
          #certificate-sheet {
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #222222 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 32px !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
