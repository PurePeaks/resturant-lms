import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export const PASS_THRESHOLD = 90;
export const QUIZ_ELIGIBLE_RATIO = 0.8;
export const COMPLETION_RATIO = 0.95;
export const QUIZ_ATTEMPTS_PER_WINDOW = 3;
export const QUIZ_WINDOW_HOURS = 24;

// ─── Watch progress ──────────────────────────────────────────────────────────

/** Fastest playback speed the player allows. Progress can never outrun it. */
export const PLAYBACK_RATE_CAP = 1.5;
/** A gap longer than this between saves means the viewer paused. */
const SEGMENT_GAP_SECONDS = 30;
/** Slack for rounding and network jitter within a viewing segment. */
const SEGMENT_TOLERANCE_SECONDS = 3;

export interface ProgressState {
  maxWatchedSeconds: number;
  updatedAt: Date;
  segmentStartedAt: Date | null;
  segmentStartSeconds: number;
}

export interface ProgressDecision {
  accepted: boolean;
  maxWatchedSeconds: number;
  segmentStartedAt: Date;
  segmentStartSeconds: number;
}

/**
 * Decides whether a reported high-water mark is plausible. Within a continuous
 * viewing segment the mark may advance at most PLAYBACK_RATE_CAP seconds per
 * real second. After a pause a new segment starts, credited with at most
 * SEGMENT_GAP_SECONDS of real time, so pausing can't be banked to skip ahead.
 * The tolerance is per segment, not per request, so sending many small
 * requests gains nothing.
 */
export function evaluateProgress(prev: ProgressState | null, reportedSeconds: number, now: Date): ProgressDecision {
  const prevMax = prev?.maxWatchedSeconds ?? 0;

  let segmentStartedAt: Date;
  let segmentStartSeconds: number;

  if (!prev) {
    segmentStartedAt = now;
    segmentStartSeconds = 0;
  } else {
    const gapSeconds = (now.getTime() - prev.updatedAt.getTime()) / 1000;
    if (!prev.segmentStartedAt || gapSeconds > SEGMENT_GAP_SECONDS) {
      const credit = Math.min(Math.max(gapSeconds, 0), SEGMENT_GAP_SECONDS);
      segmentStartedAt = new Date(now.getTime() - credit * 1000);
      segmentStartSeconds = prevMax;
    } else {
      segmentStartedAt = prev.segmentStartedAt;
      segmentStartSeconds = prev.segmentStartSeconds;
    }
  }

  const elapsed = Math.max(0, (now.getTime() - segmentStartedAt.getTime()) / 1000);
  const allowedMax = segmentStartSeconds + elapsed * PLAYBACK_RATE_CAP + SEGMENT_TOLERANCE_SECONDS;

  if (reportedSeconds > allowedMax) {
    return { accepted: false, maxWatchedSeconds: prevMax, segmentStartedAt, segmentStartSeconds };
  }
  return {
    accepted: true,
    maxWatchedSeconds: Math.max(prevMax, reportedSeconds),
    segmentStartedAt,
    segmentStartSeconds,
  };
}

export function isVideoCompleted(maxWatchedSeconds: number, moduleDuration: number | null): boolean {
  return !!moduleDuration && maxWatchedSeconds >= moduleDuration * COMPLETION_RATIO;
}

export function isQuizEligible(maxWatchedSeconds: number, moduleDuration: number | null): boolean {
  return !!moduleDuration && maxWatchedSeconds >= moduleDuration * QUIZ_ELIGIBLE_RATIO;
}

// ─── Certificates ────────────────────────────────────────────────────────────

export type CertificateStatus = "valid" | "expired" | "revoked";

/** Revocation reason for a certificate replaced by a newer one for the same module. */
export const SUPERSEDED_REASON = "Superseded by a newer certificate";

export function certificateStatus(
  cert: { revokedAt: Date | null; expiresAt: Date | null },
  now: Date = new Date()
): CertificateStatus {
  if (cert.revokedAt) return "revoked";
  if (cert.expiresAt && cert.expiresAt <= now) return "expired";
  return "valid";
}

/** 16 hex characters (64 random bits), shown to people as ABCD-EF12-3456-7890. */
export function generateVerificationCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

export function formatVerificationCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

/** Accepts codes typed with dashes, spaces or lowercase letters. */
export function normalizeVerificationCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function certificatePath(code: string): string {
  return `/certificates/${code}`;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Issues a certificate inside the caller's transaction. Any earlier
 * certificate for the same module is marked superseded, so only one is active.
 */
export async function issueCertificate(
  tx: Prisma.TransactionClient,
  params: { userId: string; moduleId: string; score: number; quizVersion: number; validityMonths: number | null }
) {
  const now = new Date();
  await tx.certificate.updateMany({
    where: { userId: params.userId, moduleId: params.moduleId, revokedAt: null },
    data: { revokedAt: now, revokedReason: SUPERSEDED_REASON },
  });

  const verificationCode = generateVerificationCode();
  return tx.certificate.create({
    data: {
      userId: params.userId,
      moduleId: params.moduleId,
      issuedAt: now,
      expiresAt: params.validityMonths ? addMonths(now, params.validityMonths) : null,
      score: params.score,
      quizVersion: params.quizVersion,
      verificationCode,
      pdfUrl: certificatePath(verificationCode),
    },
  });
}

// ─── Module progression ──────────────────────────────────────────────────────

export interface StaffModuleState {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  orderIndex: number;
  durationSeconds: number | null;
  questionCount: number;
  quizVersion: number;
  validityMonths: number | null;
  watchedSeconds: number;
  maxWatchedSeconds: number;
  completed: boolean;
  quizEligible: boolean;
  passed: boolean;
  isLocked: boolean;
  requiredPreviousTitle: string | null;
  latestScore: number | null;
  attemptsCount: number;
  attemptsRemaining: number;
  nextAttemptAt: Date | null;
  certificate: {
    id: string;
    verificationCode: string;
    issuedAt: Date;
    expiresAt: Date | null;
    status: CertificateStatus;
  } | null;
}

/**
 * The single source of truth for what a staff member can see and do. The
 * module list, the progress route and the quiz route all use it, so the UI
 * and the API can never disagree about which modules are unlocked.
 *
 * A module counts as passed once it has an active certificate (modules
 * without a quiz count as passed once the video is completed). The next
 * module unlocks only when the previous one is passed.
 */
export async function getStaffModuleStates(userId: string, tenantId: string): Promise<StaffModuleState[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - QUIZ_WINDOW_HOURS * 60 * 60 * 1000);

  const modules = await prisma.module.findMany({
    where: { tenantId, publishedAt: { not: null }, archivedAt: null },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { questions: true } },
      watchProgress: { where: { userId } },
      quizAttempts: { where: { userId, voidedAt: null }, orderBy: { createdAt: "desc" } },
      certificates: { where: { userId, revokedAt: null }, orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });

  const states: StaffModuleState[] = [];
  let previousPassed = true;
  let previousTitle: string | null = null;

  for (const m of modules) {
    const wp = m.watchProgress[0];
    const cert = m.certificates[0];
    const maxWatched = wp?.maxWatchedSeconds ?? 0;
    const completed = wp?.completed ?? false;
    const hasQuiz = m._count.questions > 0;
    const passed = hasQuiz ? !!cert : completed;

    const recentAttempts = m.quizAttempts.filter((a) => a.createdAt > windowStart);
    const attemptsRemaining = Math.max(0, QUIZ_ATTEMPTS_PER_WINDOW - recentAttempts.length);
    const oldestRecent = recentAttempts[recentAttempts.length - 1];
    const nextAttemptAt =
      attemptsRemaining === 0 && oldestRecent
        ? new Date(oldestRecent.createdAt.getTime() + QUIZ_WINDOW_HOURS * 60 * 60 * 1000)
        : null;

    states.push({
      id: m.id,
      title: m.title,
      description: m.description,
      videoUrl: m.videoUrl,
      orderIndex: m.orderIndex,
      durationSeconds: m.durationSeconds,
      questionCount: m._count.questions,
      quizVersion: m.quizVersion,
      validityMonths: m.validityMonths,
      watchedSeconds: wp?.watchedSeconds ?? 0,
      maxWatchedSeconds: maxWatched,
      completed,
      quizEligible: isQuizEligible(maxWatched, m.durationSeconds),
      passed,
      isLocked: !previousPassed,
      requiredPreviousTitle: previousPassed ? null : previousTitle,
      latestScore: m.quizAttempts[0]?.score ?? null,
      attemptsCount: m.quizAttempts.length,
      attemptsRemaining,
      nextAttemptAt,
      certificate: cert
        ? {
            id: cert.id,
            verificationCode: cert.verificationCode,
            issuedAt: cert.issuedAt,
            expiresAt: cert.expiresAt,
            status: certificateStatus(cert, now),
          }
        : null,
    });

    previousPassed = passed;
    previousTitle = m.title;
  }

  return states;
}

/** The module's state for this staff member, or a 404/403 if it isn't available to them. */
export async function requireModuleAccess(
  user: { id: string; tenantId: string | null },
  moduleId: string
): Promise<StaffModuleState> {
  if (!user.tenantId) throw new ApiError(403, "Your account is not assigned to a venue.");
  const states = await getStaffModuleStates(user.id, user.tenantId);
  const state = states.find((s) => s.id === moduleId);
  if (!state) throw new ApiError(404, "Module not found");
  if (state.isLocked) {
    throw new ApiError(403, `Complete "${state.requiredPreviousTitle}" first to unlock this module.`, {
      code: "MODULE_LOCKED",
    });
  }
  return state;
}
