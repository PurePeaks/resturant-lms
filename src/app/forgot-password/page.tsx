"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell, { AuthMessage, authButtonClass, authInputClass, authLabelClass } from "@/components/ui/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ tone: "success", message: data.message });
      } else if (data.code === "EMAIL_NOT_CONFIGURED") {
        setResult({ tone: "info", message: data.error });
      } else {
        setResult({ tone: "error", message: data.error || "Something went wrong. Please try again." });
      }
    } catch {
      setResult({ tone: "error", message: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your work email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="text-xs text-neutral-400 hover:text-white transition-colors">
          &larr; Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="name@restaurant.com"
          />
        </div>

        {result && <AuthMessage tone={result.tone}>{result.message}</AuthMessage>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
