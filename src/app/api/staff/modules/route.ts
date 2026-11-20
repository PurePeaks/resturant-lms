import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { certificatePath, getStaffModuleStates } from "@/lib/training";

// GET /api/staff/modules — this staff member's modules with sequential unlocking
export const GET = api(async () => {
  const user = await requireUser({ roles: ["STAFF"] });
  const states = await getStaffModuleStates(user.id, user.tenantId!);

  return NextResponse.json(
    states.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      // Locked modules don't reveal their video until they unlock.
      videoUrl: s.isLocked ? null : s.videoUrl,
      orderIndex: s.orderIndex,
      questionCount: s.questionCount,
      watchedSeconds: s.maxWatchedSeconds,
      durationSeconds: s.durationSeconds ?? 0,
      completed: s.completed,
      quizEligible: s.quizEligible,
      quizPassed: s.passed,
      quizScore: s.latestScore,
      attemptsCount: s.attemptsCount,
      attemptsRemaining: s.attemptsRemaining,
      nextAttemptAt: s.nextAttemptAt,
      certificateUrl: s.certificate ? certificatePath(s.certificate.verificationCode) : null,
      certificateStatus: s.certificate?.status ?? null,
      certificateExpiresAt: s.certificate?.expiresAt ?? null,
      isLocked: s.isLocked,
      requiredPreviousTitle: s.requiredPreviousTitle,
    }))
  );
});
