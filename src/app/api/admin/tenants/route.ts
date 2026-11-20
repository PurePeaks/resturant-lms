import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validation";
import { generateTemporaryPassword, hashPassword } from "@/lib/passwords";
import { audit } from "@/lib/audit";
import { sendWelcomeEmail } from "@/lib/people";
import { baseUrlFrom } from "@/lib/request";

// GET /api/admin/tenants — every venue with its people and equipment summary
export const GET = api(async () => {
  await requireUser({ roles: ["SUPER_ADMIN"] });

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { modules: { where: { archivedAt: null } } } },
      users: {
        where: { anonymizedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          deactivatedAt: true,
          _count: { select: { certificates: { where: { revokedAt: null } }, quizAttempts: true } },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
      equipment: {
        select: {
          id: true,
          name: true,
          type: true,
          cooksCount: true,
          maxCooks: true,
          quantity: true,
          status: true,
          notes: true,
          updatedAt: true,
        },
        orderBy: [{ type: "asc" }, { cooksCount: "desc" }],
      },
    },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    tenants.map((t) => {
      const activeCookingPlates = t.equipment.filter((e) => e.type === "COOKING_PLATE" && e.status !== "RETIRED");
      const totalCookingPlates = activeCookingPlates.reduce((sum, e) => sum + (e.quantity || 1), 0);
      const averagePlateHealth =
        activeCookingPlates.length > 0
          ? Math.round(
              activeCookingPlates.reduce(
                (sum, p) => sum + Math.max(0, Math.round(((p.maxCooks - p.cooksCount) / p.maxCooks) * 100)),
                0
              ) / activeCookingPlates.length
            )
          : 100;
      const countOf = (type: string) =>
        t.equipment.filter((e) => e.type === type).reduce((sum, e) => sum + (e.quantity || 1), 0);
      const activeUsers = t.users.filter((u) => !u.deactivatedAt);

      return {
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        archivedAt: t.archivedAt,
        userCount: activeUsers.length,
        moduleCount: t._count.modules,
        users: activeUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          certificatesCount: u._count.certificates,
          quizAttemptsCount: u._count.quizAttempts,
        })),
        equipment: t.equipment,
        equipmentSummary: {
          totalCookingPlates,
          averagePlateHealth,
          totalMetalRings: countOf("METAL_RING"),
          totalServingPlates: countOf("SERVING_PLATE"),
          nearDepletedCount: t.equipment.filter((e) => e.type === "COOKING_PLATE" && e.cooksCount >= 36).length,
        },
      };
    })
  );
});

const createSchema = z.object({
  tenantName: z.string().trim().min(1, "Venue name is required").max(120),
  managerName: nameSchema,
  managerEmail: emailSchema,
  // Optional: a random temporary password is generated when omitted.
  managerPassword: z.union([passwordSchema, z.literal("")]).optional(),
});

// POST /api/admin/tenants — create a venue and its first manager account
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const body = await parseBody(req, createSchema);

  const existing = await prisma.user.findUnique({ where: { email: body.managerEmail }, select: { id: true } });
  if (existing) throw new ApiError(409, "Email already in use");

  const temporaryPassword = body.managerPassword || generateTemporaryPassword();
  const tenant = await prisma.tenant.create({
    data: {
      name: body.tenantName,
      users: {
        create: {
          email: body.managerEmail,
          passwordHash: await hashPassword(temporaryPassword),
          name: body.managerName,
          role: "MANAGER",
          mustChangePassword: true,
        },
      },
    },
    include: { users: { select: { id: true, name: true, email: true } } },
  });

  await audit(user, {
    action: "venue.created",
    targetType: "venue",
    targetId: tenant.id,
    tenantId: tenant.id,
    summary: `${user.name} created venue "${tenant.name}" with manager ${body.managerEmail}`,
  });

  const welcomeEmailSent = await sendWelcomeEmail(tenant.users[0], baseUrlFrom(req.headers));

  return NextResponse.json(
    { tenantId: tenant.id, tenantName: tenant.name, managerEmail: body.managerEmail, temporaryPassword, welcomeEmailSent },
    { status: 201 }
  );
});
