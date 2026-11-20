import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";
import { idSchema } from "@/lib/validation";
import { equipmentStatusSchema, equipmentTypeSchema } from "@/lib/equipment";

const createSchema = z.object({
  tenantId: idSchema.nullish(),
  name: z.string().trim().min(1, "Item name is required").max(120),
  type: equipmentTypeSchema,
  quantity: z.coerce.number().int().min(1).max(10000).default(1),
  cooksCount: z.coerce.number().int().min(0).max(100000).default(0),
  maxCooks: z.coerce.number().int().min(1).max(100000).default(40),
  status: equipmentStatusSchema.default("ACTIVE"),
  notes: z.string().trim().max(1000).nullish(),
});

// GET /api/manager/equipment — salt slab equipment and health meters for one venue
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const tenantId = venueScope(user, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) throw new ApiError(400, "Choose a venue");

  const items = await prisma.equipmentItem.findMany({
    where: { tenantId },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
  });

  const activeCookingPlates = items.filter((e) => e.type === "COOKING_PLATE" && e.status !== "RETIRED");

  const totalCookingPlates = activeCookingPlates.reduce((sum, e) => sum + (e.quantity || 1), 0);

  const averagePlateHealth =
    activeCookingPlates.length > 0
      ? Math.round(
          activeCookingPlates.reduce((sum, p) => {
            const max = p.maxCooks || 40;
            const h = Math.max(0, Math.round(((max - p.cooksCount) / max) * 100));
            return sum + h;
          }, 0) / activeCookingPlates.length
        )
      : 100;

  const totalMetalRings = items
    .filter((e) => e.type === "METAL_RING" && e.status !== "RETIRED")
    .reduce((sum, e) => sum + (e.quantity || 1), 0);

  const totalServingPlates = items
    .filter((e) => e.type === "SERVING_PLATE" && e.status !== "RETIRED")
    .reduce((sum, e) => sum + (e.quantity || 1), 0);

  const nearDepletedCount = items.filter(
    (e) => e.type === "COOKING_PLATE" && e.cooksCount >= 36 && e.status !== "RETIRED"
  ).length;

  const retiredCount = items.filter((e) => e.status === "RETIRED").length;

  return NextResponse.json({
    items,
    stats: {
      totalCookingPlates,
      averagePlateHealth,
      totalMetalRings,
      totalServingPlates,
      nearDepletedCount,
      retiredCount,
    },
  });
});

// POST /api/manager/equipment — add a salt cooking slab, metal ring, or serving plate
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const body = await parseBody(req, createSchema);
  const tenantId = venueScope(user, body.tenantId);
  if (!tenantId) throw new ApiError(400, "Choose a venue");

  const venue = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!venue) throw new ApiError(404, "Venue not found");

  const newItem = await prisma.equipmentItem.create({
    data: {
      tenantId,
      name: body.name,
      type: body.type,
      quantity: body.quantity,
      cooksCount: body.cooksCount,
      maxCooks: body.maxCooks,
      status: body.status,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ success: true, item: newItem }, { status: 201 });
});
