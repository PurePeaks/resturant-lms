import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { emailSchema, idSchema, nameSchema, passwordSchema, roleSchema } from "@/lib/validation";
import { generateTemporaryPassword, hashPassword } from "@/lib/passwords";
import { audit } from "@/lib/audit";
import { sendWelcomeEmail } from "@/lib/people";
import { baseUrlFrom } from "@/lib/request";

// GET /api/admin/users — managers and staff across all venues
// ?status=active (default) | former | all
export const GET = api(async (req: NextRequest) => {
  await requireUser({ roles: ["SUPER_ADMIN"] });

  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get("tenantId");
  const role = roleSchema.safeParse(searchParams.get("role"));
  const status = searchParams.get("status") ?? "active";

  const users = await prisma.user.findMany({
    where: {
      anonymizedAt: null,
      ...(tenantId && tenantId !== "ALL" ? { tenantId } : {}),
      ...(role.success ? { role: role.data } : {}),
      ...(status === "active" ? { deactivatedAt: null } : status === "former" ? { deactivatedAt: { not: null } } : {}),
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    include: {
      tenant: { select: { id: true, name: true } },
      _count: {
        select: {
          certificates: { where: { revokedAt: null } },
          quizAttempts: true,
          watchProgress: true,
        },
      },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name || (u.role === "SUPER_ADMIN" ? "Platform Central" : "Unassigned"),
      createdAt: u.createdAt,
      deactivatedAt: u.deactivatedAt,
      mustChangePassword: u.mustChangePassword,
      certificatesCount: u._count.certificates,
      quizAttemptsCount: u._count.quizAttempts,
      watchCount: u._count.watchProgress,
    }))
  );
});

const createSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    // Optional: a random temporary password is generated when omitted.
    password: z.union([passwordSchema, z.literal("")]).optional(),
    role: roleSchema,
    tenantId: idSchema.nullish(),
  })
  .refine((b) => b.role === "SUPER_ADMIN" || !!b.tenantId, {
    message: "Choose a venue for managers and staff",
    path: ["tenantId"],
  });

// POST /api/admin/users — add a super admin, manager or staff member
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });
  const body = await parseBody(req, createSchema);

  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw new ApiError(409, "An account with this email address already exists");

  const tenantId = body.role === "SUPER_ADMIN" ? null : body.tenantId!;
  if (tenantId) {
    const venue = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { archivedAt: true } });
    if (!venue) throw new ApiError(404, "Selected venue does not exist");
    if (venue.archivedAt) throw new ApiError(400, "Selected venue is archived");
  }

  const temporaryPassword = body.password || generateTemporaryPassword();
  const newUser = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      role: body.role,
      tenantId,
    },
    include: { tenant: { select: { id: true, name: true } } },
  });

  await audit(user, {
    action: "user.created",
    targetType: "user",
    targetId: newUser.id,
    tenantId,
    summary: `${user.name} added ${newUser.name} (${newUser.role.toLowerCase()}, ${newUser.email})`,
  });

  const welcomeEmailSent = await sendWelcomeEmail(newUser, baseUrlFrom(req.headers));

  return NextResponse.json(
    {
      success: true,
      temporaryPassword,
      welcomeEmailSent,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        tenantName: newUser.tenant?.name || "Platform Central",
      },
    },
    { status: 201 }
  );
});
