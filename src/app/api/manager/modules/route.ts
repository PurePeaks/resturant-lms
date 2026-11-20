import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";

// GET /api/manager/modules — the venue's curriculum (read-only for managers;
// authoring lives under /api/admin/modules)
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const tenantId = venueScope(user, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) throw new ApiError(400, "Choose a venue");

  const modules = await prisma.module.findMany({
    where: { tenantId, archivedAt: null },
    include: { _count: { select: { questions: true } } },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(
    modules.map(({ _count, ...m }) => ({
      ...m,
      published: m.publishedAt !== null,
      questionCount: _count.questions,
    }))
  );
});
