import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";

// GET /api/audit?tenantId=&before= — activity log. Managers see their own venue;
// super admins see everything or one venue. Paginated by createdAt.
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { searchParams } = req.nextUrl;
  const tenantId = venueScope(user, searchParams.get("tenantId"));

  const beforeParam = searchParams.get("before");
  const before = beforeParam ? new Date(beforeParam) : null;
  const pageSize = 50;

  const entries = await prisma.auditLog.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      ...(before && !isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: pageSize + 1,
    select: {
      id: true,
      actorName: true,
      actorRole: true,
      action: true,
      targetType: true,
      summary: true,
      tenantId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    entries: entries.slice(0, pageSize),
    hasMore: entries.length > pageSize,
  });
});
