import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody, parseWith } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import {
  PASS_THRESHOLD,
  QUIZ_ATTEMPTS_PER_WINDOW,
  certificatePath,
  issueCertificate,
  requireModuleAccess,
  type StaffModuleState,
} from "@/lib/training";
import { idSchema } from "@/lib/validation";

const submitSchema = z.object({
  moduleId: idSchema,
  answers: z.record(z.string().max(64), z.number().int().min(0).max(10)),
});

function quizStatus(state: StaffModuleState) {
  return {
    attemptsRemaining: state.attemptsRemaining,
    attemptsPerDay: QUIZ_ATTEMPTS_PER_WINDOW,
    nextAttemptAt: state.nextAttemptAt,
    quizEligible: state.quizEligible,
    alreadyCertified: state.certificate?.status === "valid",
    certificateUrl: state.certificate ? certificatePath(state.certificate.verificationCode) : null,
  };
}

// GET /api/staff/quiz?moduleId=xxx — questions without answers, plus attempt status
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["STAFF"] });
  const moduleId = parseWith(idSchema, req.nextUrl.searchParams.get("moduleId"));
  const state = await requireModuleAccess(user, moduleId);

  const [questions, pastAttempts] = await Promise.all([
    prisma.question.findMany({
      where: { moduleId },
      select: { id: true, questionText: true, options: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, moduleId, voidedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, score: true, passed: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    module: { id: state.id, title: state.title, description: state.description },
    questions,
    pastAttempts,
    passThreshold: PASS_THRESHOLD,
    ...quizStatus(state),
  });
});

// POST /api/staff/quiz — graded on the server
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["STAFF"] });
  const { moduleId, answers } = await parseBody(req, submitSchema);
  const state = await requireModuleAccess(user, moduleId);

  if (!state.durationSeconds) {
    throw new ApiError(409, "This module's video is still being set up. Please try again later.");
  }
  if (!state.quizEligible) {
    throw new ApiError(403, "Watch at least 80% of the training video before taking the quiz.", {
      code: "VIDEO_NOT_WATCHED",
    });
  }
  if (state.certificate?.status === "valid") {
    throw new ApiError(409, "You already hold a valid certificate for this module.", { ...quizStatus(state) });
  }
  if (state.attemptsRemaining === 0) {
    throw new ApiError(429, `You've used all ${QUIZ_ATTEMPTS_PER_WINDOW} attempts for today. Please review the video and try again later.`, {
      code: "ATTEMPT_LIMIT",
      ...quizStatus(state),
    });
  }

  const questions = await prisma.question.findMany({ where: { moduleId } });
  if (questions.length === 0) {
    throw new ApiError(404, "No questions configured for this module");
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= PASS_THRESHOLD;

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: { userId: user.id, moduleId, score, passed, quizVersion: state.quizVersion },
    });
    const certificate = passed
      ? await issueCertificate(tx, {
          userId: user.id,
          moduleId,
          score,
          quizVersion: state.quizVersion,
          validityMonths: state.validityMonths,
        })
      : null;
    return { attempt, certificate };
  });

  if (result.certificate) {
    await audit(user, {
      action: "certificate.issued",
      targetType: "certificate",
      targetId: result.certificate.id,
      tenantId: user.tenantId,
      summary: `${user.name} passed "${state.title}" with ${score}%`,
    });
  }

  // Which questions were wrong is deliberately not returned: combined with
  // retries it would let anyone find the answers by elimination.
  return NextResponse.json({
    score,
    passed,
    correctCount,
    totalQuestions: questions.length,
    attemptId: result.attempt.id,
    attemptsRemaining: Math.max(0, state.attemptsRemaining - 1),
    certificateUrl: result.certificate ? certificatePath(result.certificate.verificationCode) : null,
    expiresAt: result.certificate?.expiresAt ?? null,
  });
});
