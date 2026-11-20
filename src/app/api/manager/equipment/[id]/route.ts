import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser, type CurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { equipmentStatusSchema, equipmentTypeSchema } from "@/lib/equipment";

type Params = { params: Promise<{ id: string }> };

const notesSchema = z.string().trim().max(1000).nullish();

const patchSchema = z.discriminatedUnion("action", [
  // +1 cook (or a custom amount)
  z.object({
    action: z.literal("increment_cook"),
    amount: z.coerce.number().int().min(1).max(1000).default(1),
    autoRetire: z.boolean().optional(),
    notes: notesSchema,
  }),
  // Retire, maintenance, active
  z.object({
    action: z.literal("set_status"),
    status: equipmentStatusSchema,
  }),
  // Full field edit
  z.object({
    action: z.literal("update"),
    name: z.string().trim().min(1).max(120).optional(),
    type: equipmentTypeSchema.optional(),
    quantity: z.coerce.number().int().min(1).max(10000).optional(),
    cooksCount: z.coerce.number().int().min(0).max(100000).optional(),
    maxCooks: z.coerce.number().int().min(1).max(100000).optional(),
    status: equipmentStatusSchema.optional(),
    notes: notesSchema,
  }),
]);

/** Loads an item the user may edit; other venues' items look like they don't exist. */
async function requireItem(user: CurrentUser, id: string) {
  const item = await prisma.equipmentItem.findUnique({ where: { id } });
  if (!item || (user.role !== "SUPER_ADMIN" && item.tenantId !== user.tenantId)) {
    throw new ApiError(404, "Equipment item not found");
  }
  return item;
}

// PATCH /api/manager/equipment/[id] — +1 cook, change status, or edit fields
export const PATCH = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { id } = await params;
  const existing = await requireItem(user, id);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  // Field edits historically omitted "action".
  const withAction = raw && typeof raw === "object" && !("action" in raw) ? { ...raw, action: "update" } : raw;
  const body = patchSchema.safeParse(withAction);
  if (!body.success) throw new ApiError(400, body.error.issues[0].message);
  const input = body.data;

  if (input.action === "increment_cook") {
    const newCooks = existing.cooksCount + input.amount;
    const reachedLifespan = newCooks >= existing.maxCooks;
    const updated = await prisma.equipmentItem.update({
      where: { id },
      data: {
        cooksCount: newCooks,
        status: reachedLifespan && input.autoRetire ? "RETIRED" : existing.status,
        notes: input.notes !== undefined ? input.notes || null : existing.notes,
      },
    });
    return NextResponse.json({ success: true, item: updated, reachedLifespan });
  }

  if (input.action === "set_status") {
    const updated = await prisma.equipmentItem.update({ where: { id }, data: { status: input.status } });
    return NextResponse.json({ success: true, item: updated });
  }

  const updated = await prisma.equipmentItem.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      quantity: input.quantity,
      cooksCount: input.cooksCount,
      maxCooks: input.maxCooks,
      status: input.status,
      notes: input.notes !== undefined ? input.notes || null : undefined,
    },
  });
  return NextResponse.json({ success: true, item: updated });
});

// DELETE /api/manager/equipment/[id] — remove an equipment item
export const DELETE = api(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { id } = await params;
  const item = await requireItem(user, id);

  await prisma.equipmentItem.delete({ where: { id } });
  await audit(user, {
    action: "equipment.deleted",
    targetType: "equipment",
    targetId: id,
    tenantId: item.tenantId,
    summary: `${user.name} removed "${item.name}" from inventory`,
  });

  return NextResponse.json({ success: true });
});
