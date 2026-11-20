import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody, parseWith } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { evaluateProgress, isVideoCompleted, requireModuleAccess } from "@/lib/training";
import { idSchema } from "@/lib/validation";

const seconds = z.number().finite().min(0).max(24 * 60 * 60);

// Any durationSeconds the browser sends is ignored: the module's stored
// duration is the only one that counts.
const progressSchema = z.object({
  moduleId: idSchema,
  watchedSeconds: seconds,
  maxWatchedSeconds: seconds.optional(),
});

// GET /api/progress?moduleId=xxx
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["STAFF"] });
  const moduleId = parseWith(idSchema, req.nextUrl.searchParams.get("moduleId"));
  const state = await requireModuleAccess(user, moduleId);

  const duration = state.durationSeconds ?? 0;
  return NextResponse.json({
    watchedSeconds: state.watchedSeconds,
    maxWatchedSeconds: state.maxWatchedSeconds,
    durationSeconds: duration,
    percentWatched: duration > 0 ? Math.min(100, Math.round((state.maxWatchedSeconds / duration) * 100)) : 0,
    completed: state.completed,
  });
});

// POST /api/progress
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["STAFF"] });
  const body = await parseBody(req, progressSchema);
  const state = await requireModuleAccess(user, body.moduleId);

  const existing = await prisma.watchProgress.findUnique({
    where: { userId_moduleId: { userId: user.id, moduleId: body.moduleId } },
  });

  const reported = Math.max(body.watchedSeconds, body.maxWatchedSeconds ?? 0);
  const now = new Date();
  const decision = evaluateProgress(existing, reported, now);

  if (!decision.accepted) {
    throw new ApiError(422, "Skip detected", { lastConfirmedSeconds: decision.maxWatchedSeconds });
  }

  const moduleDuration = state.durationSeconds;
  const maxWatchedSeconds = moduleDuration ? Math.min(decision.maxWatchedSeconds, moduleDuration) : decision.maxWatchedSeconds;
  const completed = (existing?.completed ?? false) || isVideoCompleted(maxWatchedSeconds, moduleDuration);
  const data = {
    watchedSeconds: Math.min(body.watchedSeconds, maxWatchedSeconds),
    maxWatchedSeconds,
    durationSeconds: moduleDuration ?? 0,
    completed,
    segmentStartedAt: decision.segmentStartedAt,
    segmentStartSeconds: decision.segmentStartSeconds,
  };

  await prisma.watchProgress.upsert({
    where: { userId_moduleId: { userId: user.id, moduleId: body.moduleId } },
    update: data,
    create: { userId: user.id, moduleId: body.moduleId, ...data },
  });

  return NextResponse.json({
    ok: true,
    watchedSeconds: maxWatchedSeconds,
    completed,
    // The super admin hasn't confirmed this video's length yet, so progress is
    // saved but the module can't be completed until they do.
    durationPending: !moduleDuration,
  });
});
