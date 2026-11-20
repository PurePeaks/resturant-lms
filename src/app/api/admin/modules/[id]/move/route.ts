import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const schema = z.object({ direction: z.enum(["up", "down"]) });

// POST /api/admin/modules/[id]/move — move a module one place earlier or later
// in its venue's sequence (the order staff unlock them in).
export const POST = api(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const { direction } = await parseBody(req, schema);

  const target = await prisma.module.findUnique({ where: { id }, select: { tenantId: true, title: true } });
  if (!target) throw new ApiError(404, "Module not found");

  const siblings = await prisma.module.findMany({
    where: { tenantId: target.tenantId, archivedAt: null },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const index = siblings.findIndex((m) => m.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= siblings.length) {
    return NextResponse.json({ success: true, moved: false });
  }

  const ordered = siblings.map((m) => m.id);
  [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];

  // Renumber 1..n so ties from older data are resolved too.
  await prisma.$transaction(
    ordered.map((moduleId, i) => prisma.module.update({ where: { id: moduleId }, data: { orderIndex: i + 1 } }))
  );

  await audit(user, {
    action: "module.reordered",
    targetType: "module",
    targetId: id,
    tenantId: target.tenantId,
    summary: `${user.name} moved "${target.title}" ${direction}`,
  });

  return NextResponse.json({ success: true, moved: true });
});
