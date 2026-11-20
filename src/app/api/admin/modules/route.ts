import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { moduleCreateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

// GET /api/admin/modules — every venue's modules, for curriculum management
export const GET = api(async (req: NextRequest) => {
  await requireUser({ roles: ["SUPER_ADMIN"] });

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const includeArchived = req.nextUrl.searchParams.get("archived") === "include";

  const modules = await prisma.module.findMany({
    where: {
      ...(tenantId && tenantId !== "ALL" ? { tenantId } : {}),
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    include: {
      tenant: { select: { id: true, name: true } },
      questions: { select: { id: true, questionText: true, options: true, correctAnswer: true } },
      _count: { select: { questions: true, watchProgress: true, certificates: true } },
    },
    orderBy: [{ tenantId: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(
    modules.map(({ _count, ...m }) => ({
      ...m,
      published: m.publishedAt !== null,
      questionCount: _count.questions,
      completionsCount: _count.certificates,
    }))
  );
});

// POST /api/admin/modules — create a module (with quiz) for one venue or all venues
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const body = await parseBody(req, moduleCreateSchema);

  const tenants =
    body.tenantId === "ALL"
      ? await prisma.tenant.findMany({ where: { archivedAt: null }, select: { id: true, name: true } })
      : await prisma.tenant.findMany({ where: { id: body.tenantId, archivedAt: null }, select: { id: true, name: true } });

  if (tenants.length === 0) {
    throw new ApiError(body.tenantId === "ALL" ? 400 : 404, body.tenantId === "ALL" ? "No venues available." : "Venue not found");
  }

  const publishedAt = body.published === false ? null : new Date();
  const questions = body.questions ?? [];

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const t of tenants) {
      // Each venue gets the new module at the end of its own sequence.
      const last = await tx.module.findFirst({
        where: { tenantId: t.id },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      results.push(
        await tx.module.create({
          data: {
            tenantId: t.id,
            title: body.title,
            description: body.description || null,
            videoUrl: body.videoUrl,
            durationSeconds: body.durationSeconds ?? null,
            validityMonths: body.validityMonths === undefined ? 12 : body.validityMonths,
            publishedAt,
            orderIndex: (last?.orderIndex ?? 0) + 1,
            questions: questions.length ? { create: questions } : undefined,
          },
          include: { questions: true, tenant: { select: { id: true, name: true } } },
        })
      );
    }
    return results;
  });

  await audit(user, {
    action: "module.created",
    targetType: "module",
    targetId: created.length === 1 ? created[0].id : null,
    tenantId: created.length === 1 ? created[0].tenantId : null,
    summary:
      created.length === 1
        ? `${user.name} created "${body.title}" for ${tenants[0].name}`
        : `${user.name} created "${body.title}" for ${created.length} venues`,
  });

  if (body.tenantId === "ALL") {
    return NextResponse.json({ success: true, count: created.length }, { status: 201 });
  }
  return NextResponse.json(created[0], { status: 201 });
});
