"use client";

import { useState } from "react";

interface PrintCertificateButtonProps {
  certId: string;
}

export default function PrintCertificateButton({ certId }: PrintCertificateButtonProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div className="flex items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span>{copied ? "Link Copied" : "Share Verification Link"}</span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/90 to-amber-600/90 px-5 py-2 text-xs font-semibold text-black shadow-lg shadow-amber-500/20 backdrop-blur-md transition hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30"
      >
        <svg className="h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        <span>Print / Save as PDF</span>
      </button>
    </div>
  );
}
