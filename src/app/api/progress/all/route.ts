import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";
import { certificatePath, certificateStatus } from "@/lib/training";

// GET /api/progress/all — training progress for active staff (managers: own venue)
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const tenantId = venueScope(user, req.nextUrl.searchParams.get("tenantId"));

  const users = await prisma.user.findMany({
    where: { role: "STAFF", deactivatedAt: null, anonymizedAt: null, ...(tenantId ? { tenantId } : {}) },
    include: {
      watchProgress: { include: { module: { select: { title: true, durationSeconds: true } } } },
      quizAttempts: { where: { voidedAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
      certificates: { where: { revokedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      mustChangePassword: u.mustChangePassword,
      progress: u.watchProgress.map((wp) => {
        const duration = wp.module.durationSeconds ?? wp.durationSeconds;
        return {
          moduleId: wp.moduleId,
          moduleTitle: wp.module.title,
          watchedSeconds: wp.maxWatchedSeconds,
          durationSeconds: duration,
          completed: wp.completed,
          percent: duration > 0 ? Math.min(100, Math.round((wp.maxWatchedSeconds / duration) * 100)) : 0,
        };
      }),
      quizAttempts: u.quizAttempts.map((qa) => ({
        moduleId: qa.moduleId,
        score: qa.score,
        passed: qa.passed,
        createdAt: qa.createdAt,
      })),
      certificates: u.certificates.map((c) => ({
        moduleId: c.moduleId,
        pdfUrl: certificatePath(c.verificationCode),
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        status: certificateStatus(c),
      })),
    }))
  );
});
