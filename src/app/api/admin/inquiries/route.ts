import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

const statusSchema = z.enum(["NEW", "CONTACTED", "CLOSED"]);

// GET /api/admin/inquiries?status=NEW — kit reservations from the public site
export const GET = api(async (req: NextRequest) => {
  await requireUser({ roles: ["SUPER_ADMIN"] });
  const status = statusSchema.safeParse(req.nextUrl.searchParams.get("status"));

  const inquiries = await prisma.inquiry.findMany({
    where: status.success ? { status: status.data } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const counts = await prisma.inquiry.groupBy({ by: ["status"], _count: { _all: true } });

  return NextResponse.json({
    inquiries,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  });
});

const patchSchema = z.object({ id: idSchema, status: statusSchema });

// PATCH /api/admin/inquiries — move an inquiry through NEW → CONTACTED → CLOSED
export const PATCH = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id, status } = await parseBody(req, patchSchema);

  const inquiry = await prisma.inquiry.findUnique({ where: { id }, select: { referenceCode: true } });
  if (!inquiry) throw new ApiError(404, "Inquiry not found");

  await prisma.inquiry.update({ where: { id }, data: { status } });
  await audit(user, {
    action: "inquiry.updated",
    targetType: "inquiry",
    targetId: id,
    summary: `${user.name} marked inquiry ${inquiry.referenceCode} as ${status.toLowerCase()}`,
  });

  return NextResponse.json({ success: true });
});
