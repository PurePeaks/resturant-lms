import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser, type CurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1, "Venue name is required").max(120).optional(),
  archived: z.boolean().optional(),
});

async function setArchived(user: CurrentUser, tenant: { id: string; name: string; archivedAt: Date | null }, archived: boolean) {
  if (archived === (tenant.archivedAt !== null)) return;
  await prisma.tenant.update({ where: { id: tenant.id }, data: { archivedAt: archived ? new Date() : null } });
  await audit(user, {
    action: archived ? "venue.archived" : "venue.restored",
    targetType: "venue",
    targetId: tenant.id,
    tenantId: tenant.id,
    summary: archived
      ? `${user.name} archived venue "${tenant.name}" (sign-ins blocked, records kept)`
      : `${user.name} restored venue "${tenant.name}"`,
  });
}

// PATCH /api/admin/tenants/[id] — rename, archive or restore a venue
export const PATCH = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const body = await parseBody(req, patchSchema);

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new ApiError(404, "Venue not found");

  if (body.name && body.name !== tenant.name) {
    await prisma.tenant.update({ where: { id }, data: { name: body.name } });
    await audit(user, {
      action: "venue.renamed",
      targetType: "venue",
      targetId: id,
      tenantId: id,
      summary: `${user.name} renamed "${tenant.name}" to "${body.name}"`,
    });
  }
  if (body.archived !== undefined) {
    await setArchived(user, { ...tenant, name: body.name ?? tenant.name }, body.archived);
  }

  const updated = await prisma.tenant.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ success: true, tenant: updated });
});

// DELETE /api/admin/tenants/[id] — archives the venue. Its people can no longer
// sign in, but every training record and certificate is kept and can be restored.
export const DELETE = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new ApiError(404, "Venue not found");

  await setArchived(user, tenant, true);
  return NextResponse.json({
    success: true,
    archived: true,
    message: `Venue "${tenant.name}" archived. Its records are kept and it can be restored.`,
  });
});
