import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { requireManageableUser, resetUserPassword } from "@/lib/people";
import { idSchema } from "@/lib/validation";

const schema = z.object({ userId: idSchema });

// POST /api/manager/staff/reset-password — managers reset staff, super admins reset anyone.
// The new password is generated on the server and shown once.
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { userId } = await parseBody(req, schema);
  const target = await requireManageableUser(user, userId);

  const temporaryPassword = await resetUserPassword(user, target);

  return NextResponse.json({
    success: true,
    temporaryPassword,
    message: `Password reset for ${target.name}. They must choose a new one when they sign in.`,
  });
});
