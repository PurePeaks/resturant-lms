import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validation";
import { generateTemporaryPassword, hashPassword } from "@/lib/passwords";
import { audit } from "@/lib/audit";
import { sendWelcomeEmail } from "@/lib/people";
import { baseUrlFrom } from "@/lib/request";

// GET /api/manager/staff — active staff in the manager's venue
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const tenantId = venueScope(user, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) throw new ApiError(400, "Choose a venue");

  const staff = await prisma.user.findMany({
    where: { tenantId, role: "STAFF", deactivatedAt: null, anonymizedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      mustChangePassword: true,
      watchProgress: {
        select: { moduleId: true, maxWatchedSeconds: true, durationSeconds: true, completed: true },
      },
      quizAttempts: {
        where: { voidedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { score: true, passed: true },
      },
      certificates: {
        where: { revokedAt: null },
        select: { id: true, verificationCode: true, issuedAt: true, expiresAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
});

const createSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  // Optional: a random temporary password is generated when omitted.
  password: z.union([passwordSchema, z.literal("")]).optional(),
});

// POST /api/manager/staff — add a staff member to the manager's venue.
// They must choose their own password the first time they sign in.
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER"] });
  const { name, email, password } = await parseBody(req, createSchema);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new ApiError(409, "A user with this email already exists");

  const temporaryPassword = password || generateTemporaryPassword();
  const newUser = await prisma.user.create({
    data: {
      tenantId: user.tenantId,
      name,
      email,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      role: "STAFF",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await audit(user, {
    action: "staff.created",
    targetType: "user",
    targetId: newUser.id,
    tenantId: user.tenantId,
    summary: `${user.name} added ${newUser.name} (${newUser.email})`,
  });

  const welcomeEmailSent = await sendWelcomeEmail(newUser, baseUrlFrom(req.headers));

  return NextResponse.json({ ...newUser, temporaryPassword, welcomeEmailSent }, { status: 201 });
});
