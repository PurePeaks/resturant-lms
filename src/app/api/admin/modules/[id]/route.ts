import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { moduleUpdateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function requireModule(id: string) {
  const module_ = await prisma.module.findUnique({ where: { id }, include: { questions: true } });
  if (!module_) throw new ApiError(404, "Module not found");
  return module_;
}

type QuestionShape = { questionText: string; options: unknown; correctAnswer: number };

function sameQuestions(a: QuestionShape[], b: QuestionShape[]): boolean {
  const key = (qs: QuestionShape[]) =>
    JSON.stringify(qs.map((q) => [q.questionText, q.options, q.correctAnswer]));
  return key(a) === key(b);
}

// GET /api/admin/modules/[id]
export const GET = api(async (req: NextRequest, { params }: Params) => {
  await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const module_ = await prisma.module.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true } },
      questions: { select: { id: true, questionText: true, options: true, correctAnswer: true } },
    },
  });
  if (!module_) throw new ApiError(404, "Module not found");
  return NextResponse.json({ ...module_, published: module_.publishedAt !== null });
});

// PATCH /api/admin/modules/[id] — edit content, quiz, publishing and validity.
// Changing the quiz bumps its version; existing certificates keep the version they were earned on.
export const PATCH = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const existing = await requireModule(id);
  const body = await parseBody(req, moduleUpdateSchema);

  const quizChanged = body.questions !== undefined && !sameQuestions(existing.questions, body.questions);

  const updated = await prisma.$transaction(async (tx) => {
    if (quizChanged) {
      await tx.question.deleteMany({ where: { moduleId: id } });
      if (body.questions!.length > 0) {
        await tx.question.createMany({ data: body.questions!.map((q) => ({ ...q, moduleId: id })) });
      }
    }

    return tx.module.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description === undefined ? undefined : body.description || null,
        videoUrl: body.videoUrl,
        durationSeconds: body.durationSeconds,
        validityMonths: body.validityMonths,
        publishedAt:
          body.published === undefined ? undefined : body.published ? (existing.publishedAt ?? new Date()) : null,
        quizVersion: quizChanged ? { increment: 1 } : undefined,
      },
      include: { questions: true, tenant: { select: { id: true, name: true } } },
    });
  });

  // A duration-only update is the dashboard backfilling video length; not worth logging.
  const onlyDuration = Object.keys(body).every((k) => k === "durationSeconds");
  if (!onlyDuration) {
    await audit(user, {
      action: quizChanged ? "module.quiz_changed" : "module.updated",
      targetType: "module",
      targetId: id,
      tenantId: existing.tenantId,
      summary: quizChanged
        ? `${user.name} changed the quiz for "${updated.title}" (now version ${updated.quizVersion})`
        : `${user.name} updated "${updated.title}"`,
    });
  }

  return NextResponse.json({ ...updated, published: updated.publishedAt !== null });
});

// DELETE /api/admin/modules/[id] — modules with training history are archived
// (hidden, records kept); modules nobody has started are deleted outright.
export const DELETE = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const existing = await requireModule(id);

  const [progress, attempts, certificates] = await Promise.all([
    prisma.watchProgress.count({ where: { moduleId: id } }),
    prisma.quizAttempt.count({ where: { moduleId: id } }),
    prisma.certificate.count({ where: { moduleId: id } }),
  ]);
  const hasHistory = progress + attempts + certificates > 0;

  if (hasHistory) {
    await prisma.module.update({ where: { id }, data: { archivedAt: new Date(), publishedAt: null } });
  } else {
    await prisma.module.delete({ where: { id } });
  }

  await audit(user, {
    action: hasHistory ? "module.archived" : "module.deleted",
    targetType: "module",
    targetId: id,
    tenantId: existing.tenantId,
    summary: hasHistory
      ? `${user.name} archived "${existing.title}" (training records kept)`
      : `${user.name} deleted "${existing.title}"`,
  });

  return NextResponse.json({ success: true, archived: hasHistory, deletedId: id });
});
