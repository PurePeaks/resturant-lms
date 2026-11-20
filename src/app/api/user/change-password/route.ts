import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { passwordSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(200),
  newPassword: passwordSchema,
});

// POST /api/user/change-password — the signed-in user changes their own password.
// Every existing session (including this one) ends, so the user signs in again.
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ allowPendingPasswordChange: true });
  await enforceRateLimit(`change-password:${user.id}`, 10, 15 * 60);
  const { currentPassword, newPassword } = await parseBody(req, schema);

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    throw new ApiError(400, "Current password does not match our records");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, "Choose a password different from your current one");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });

  await audit(user, {
    action: "user.password_changed",
    targetType: "user",
    targetId: user.id,
    tenantId: user.tenantId,
    summary: `${user.name} changed their password`,
  });

  return NextResponse.json({ success: true, message: "Password changed. Please sign in again." });
});
