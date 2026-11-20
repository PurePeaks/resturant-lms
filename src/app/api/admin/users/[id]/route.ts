import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { emailSchema, idSchema, nameSchema, roleSchema } from "@/lib/validation";
import { deactivateUser, reactivateUser, requireManageableUser } from "@/lib/people";
import { anonymizeUser } from "@/lib/retention";
import { audit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  role: roleSchema.optional(),
  tenantId: idSchema.nullish(),
  active: z.boolean().optional(),
});

// PATCH /api/admin/users/[id] — edit details, role or venue; deactivate or reactivate
export const PATCH = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const target = await requireManageableUser(user, id);
  const body = await parseBody(req, patchSchema);

  const role = body.role ?? target.role;
  const tenantId = role === "SUPER_ADMIN" ? null : (body.tenantId ?? target.tenantId);
  if (role !== "SUPER_ADMIN" && !tenantId) {
    throw new ApiError(400, "Managers and staff must belong to a venue");
  }
  if (tenantId && tenantId !== target.tenantId) {
    const venue = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { archivedAt: true } });
    if (!venue) throw new ApiError(404, "Selected venue does not exist");
    if (venue.archivedAt) throw new ApiError(400, "Selected venue is archived");
  }
  if (body.email && body.email !== target.email) {
    const taken = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (taken) throw new ApiError(409, "Another account already uses this email");
  }

  const changes: string[] = [];
  if (body.name && body.name !== target.name) changes.push(`name → ${body.name}`);
  if (body.email && body.email !== target.email) changes.push(`email → ${body.email}`);
  if (role !== target.role) changes.push(`role → ${role}`);
  if (tenantId !== target.tenantId) changes.push("venue changed");

  if (changes.length > 0) {
    // Access-affecting changes end existing sessions so nothing stale lingers.
    const accessChanged = role !== target.role || tenantId !== target.tenantId || body.email !== undefined;
    await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        role,
        tenantId,
        sessionVersion: accessChanged ? { increment: 1 } : undefined,
      },
    });
    await audit(user, {
      action: "user.updated",
      targetType: "user",
      targetId: id,
      tenantId: tenantId ?? target.tenantId,
      summary: `${user.name} updated ${target.name}: ${changes.join(", ")}`,
    });
  }

  if (body.active === false) await deactivateUser(user, target);
  if (body.active === true) await reactivateUser(user, target);

  return NextResponse.json({ success: true });
});

// DELETE /api/admin/users/[id] — erase personal data (name, email, password).
// Training records stay, attributed to "Former staff member". Cannot be undone.
export const DELETE = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const { id } = await params;
  const target = await requireManageableUser(user, id);

  await anonymizeUser(id);
  await audit(user, {
    action: "user.erased",
    targetType: "user",
    targetId: id,
    tenantId: target.tenantId,
    summary: `${user.name} erased the personal data of a former ${target.role.toLowerCase()}`,
  });

  return NextResponse.json({ success: true });
});
