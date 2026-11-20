"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  options: string[];
}

interface ModuleInfo {
  id: string;
  title: string;
  description: string | null;
}

interface PastAttempt {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface QuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  attemptsRemaining: number;
  certificateUrl: string | null;
}

interface QuizStatus {
  attemptsRemaining: number;
  attemptsPerDay: number;
  nextAttemptAt: string | null;
  quizEligible: boolean;
  alreadyCertified: boolean;
  certificateUrl: string | null;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "later";
  return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

const PASS_THRESHOLD = 90;

function QuizContent() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("moduleId") || "";

  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [status, setStatus] = useState<QuizStatus | null>(null);

  useEffect(() => {
    let active = true;
    const request = moduleId
      ? fetch(`/api/staff/quiz?moduleId=${encodeURIComponent(moduleId)}`).then((r) => r.json())
      : Promise.resolve({ error: "No module selected. Open a quiz from your training dashboard." });

    request
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setError(data.error);
        } else {
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
          setModuleInfo(data.module || null);
          setPastAttempts(Array.isArray(data.pastAttempts) ? data.pastAttempts : []);
          setStatus({
            attemptsRemaining: data.attemptsRemaining ?? 0,
            attemptsPerDay: data.attemptsPerDay ?? 3,
            nextAttemptAt: data.nextAttemptAt ?? null,
            quizEligible: Boolean(data.quizEligible),
            alreadyCertified: Boolean(data.alreadyCertified),
            certificateUrl: data.certificateUrl ?? null,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load evaluation questions.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [moduleId]);

  // Why the quiz can't be taken right now, if it can't.
  const blockedReason = !status
    ? null
    : status.alreadyCertified
    ? "certified"
    : !status.quizEligible
    ? "video"
    : status.attemptsRemaining === 0
    ? "attempts"
    : null;

  const handleSelect = (qId: string, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/staff/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.attemptsRemaining !== undefined) {
          setStatus((prev) => (prev ? { ...prev, ...data } : prev));
        }
        throw new Error(data.error || "Failed to submit evaluation.");
      }

      setResult({
        score: data.score ?? 0,
        passed: data.passed ?? false,
        correctCount: data.correctCount ?? 0,
        totalQuestions: data.totalQuestions ?? questions.length,
        attemptsRemaining: data.attemptsRemaining ?? 0,
        certificateUrl: data.certificateUrl ?? null,
      });
      setStatus((prev) => (prev ? { ...prev, attemptsRemaining: data.attemptsRemaining ?? 0 } : prev));

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSubmitted(false);
    setResult(null);
    setAnswers({});
    setCurrentIdx(0);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400 text-sm">
          <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading compliance questions...</span>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-black text-neutral-200 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Exit to Training Dashboard</span>
          </Link>

          {pastAttempts.length > 0 && !submitted && (
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:text-white transition"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{pastAttempts.length} Past Attempts</span>
            </button>
          )}
        </div>

        {/* Past Attempts Drawer / Card */}
        {showHistory && pastAttempts.length > 0 && !submitted && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 border-b border-neutral-800 pb-2">
              <span>Attempt History</span>
              <span>Pass threshold: 90%</span>
            </div>
            <div className="space-y-2">
              {pastAttempts.map((att, i) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80"
                >
                  <span className="text-neutral-400">
                    Attempt #{pastAttempts.length - i} &middot; {new Date(att.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{att.score}%</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        att.passed
                          ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400"
                          : "bg-red-950 border border-red-500/30 text-red-400"
                      }`}
                    >
                      {att.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header Title Section */}
        <div className="rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950 p-6 md:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 px-3 py-0.5 text-xs font-semibold text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Official Compliance Evaluation
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              90% to pass
              {status && !status.alreadyCertified && ` · ${status.attemptsRemaining} of ${status.attemptsPerDay} attempts left today`}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {moduleInfo?.title || "Accreditation Quiz"}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-neutral-400">
            {moduleInfo?.description ||
              "Test your knowledge of the safety standards covered in the video. All questions must be completed."}
          </p>

          {/* Question Stepper / Progress Bar */}
          {!submitted && questions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">
                  Question <strong className="text-white">{currentIdx + 1}</strong> of {questions.length}
                </span>
                <span className="text-neutral-400 font-mono">
                  {answeredCount} of {questions.length} answered
                </span>
              </div>

              {/* Numbered Jump Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = currentIdx === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-8 w-8 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center border ${
                        isCurrent
                          ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30"
                          : isAnswered
                          ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      title={`Jump to Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs md:text-sm text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {/* Empty state */}
        {questions.length === 0 && !error && (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-12 text-center text-sm text-neutral-400">
            No questions configured for this curriculum yet.
          </div>
        )}

        {/* Quiz unavailable right now */}
        {!submitted && blockedReason && status && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-6 md:p-8 space-y-3">
            <h2 className="text-base font-bold text-white">
              {blockedReason === "certified"
                ? "You're already certified for this module"
                : blockedReason === "video"
                ? "Watch the training video first"
                : "No attempts left today"}
            </h2>
            <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
              {blockedReason === "certified"
                ? "Your certificate is still valid. You can take this quiz again once it expires."
                : blockedReason === "video"
                ? "You need to watch at least 80% of the training video before the quiz unlocks."
                : `You've used all ${status.attemptsPerDay} attempts for the last 24 hours. Re-watch the video and try again ${formatWhen(status.nextAttemptAt)}.`}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {blockedReason === "certified" && status.certificateUrl && (
                <Link
                  href={status.certificateUrl}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  View certificate
                </Link>
              )}
              <Link
                href="/dashboard/staff"
                className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition"
              >
                Back to training
              </Link>
            </div>
          </div>
        )}

        {/* Active Question Card */}
        {!submitted && !blockedReason && currentQ && (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 md:p-8 space-y-6 shadow-xl transition-all">
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                Question #{currentIdx + 1}
              </div>
              <h2 className="text-base md:text-lg font-semibold text-white leading-relaxed">
                {currentQ.questionText}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {(currentQ.options as string[]).map((opt, optIdx) => {
                const selected = answers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelect(currentQ.id, optIdx)}
                    className={`w-full rounded-2xl border px-5 py-4 text-left text-sm transition-all flex items-center justify-between group ${
                      selected
                        ? "border-blue-500 bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/40"
                        : "border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-950"
                    }`}
                  >
                    <span className="font-medium pr-4 leading-normal">{opt}</span>
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-neutral-700 group-hover:border-neutral-500"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-800/80">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <div className="text-xs text-neutral-500 font-mono">
                {currentIdx + 1} / {questions.length}
              </div>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2 text-xs font-semibold text-white transition"
                >
                  <span>Next Question</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allAnswered}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                >
                  <span>{submitting ? "Grading..." : "Submit Quiz"}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Global Submit Banner (available whenever all answered) */}
        {!submitted && !blockedReason && questions.length > 0 && currentIdx < questions.length - 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <span className="text-xs text-neutral-400">
              {allAnswered ? (
                <span className="text-emerald-400 font-medium">All {questions.length} questions answered!</span>
              ) : (
                <span>{questions.length - answeredCount} questions remaining</span>
              )}
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !allAnswered}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
            >
              {submitting ? "Evaluating..." : "Submit All Answers"}
            </button>
          </div>
        )}

        {/* Comprehensive Results Screen */}
        {submitted && result && (
          <div className="space-y-6">
            <div
              className={`rounded-3xl border p-8 text-center space-y-6 shadow-2xl ${
                result.passed
                  ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 via-neutral-900 to-neutral-950"
                  : "border-red-500/40 bg-gradient-to-b from-red-950/30 via-neutral-900 to-neutral-950"
              }`}
            >
              {/* Status Emblem */}
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border shadow-inner ${
                  result.passed
                    ? "bg-emerald-950 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20"
                    : "bg-red-950 border-red-500/50 text-red-400 shadow-red-500/20"
                }`}
              >
                {result.passed ? (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              <div>
                <h2 className="text-5xl font-extrabold text-white tracking-tight font-mono">{result.score}%</h2>
                <p className={`text-lg font-bold mt-2 ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
                  {result.passed ? "Accreditation Passed" : "Passing Threshold Not Reached"}
                </p>
                <p className="text-xs md:text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                  {result.passed
                    ? `Congratulations! You answered ${result.correctCount} of ${result.totalQuestions} correctly, exceeding the required 90% threshold. Your compliance certificate has been issued.`
                    : `You scored ${result.score}% (${result.correctCount} of ${result.totalQuestions} correct). A minimum score of ${PASS_THRESHOLD}% is required for compliance accreditation.`}
                </p>
              </div>

              {/* Certificate Download CTA */}
              {result.passed && result.certificateUrl && (
                <div className="pt-2">
                  <a
                    href={result.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>View / Download Official Certificate</span>
                  </a>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-neutral-800">
                <Link
                  href="/dashboard/staff"
                  className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-5 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                >
                  Return to Dashboard
                </Link>

                {!result.passed && result.attemptsRemaining > 0 && (
                  <button
                    onClick={handleRetake}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/25"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Retake Evaluation</span>
                  </button>
                )}
              </div>
            </div>

            {/* Which answers were wrong is not shown: with retries that would reveal the answers. */}
            {!result.passed && (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 md:p-8 space-y-2">
                <h3 className="text-base font-bold text-white">Before you try again</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Re-watch the training video, paying attention to temperatures, handling and protocol steps.{" "}
                  {result.attemptsRemaining > 0
                    ? `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} left today.`
                    : `You've used today's attempts. You can try again ${formatWhen(status?.nextAttemptAt ?? null)}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-sm">
          Loading evaluation session...
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
