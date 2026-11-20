import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { passwordSchema } from "@/lib/validation";
import { clearRateLimit, enforceRateLimit, loginLockKey } from "@/lib/rateLimit";
import { requestIp } from "@/lib/request";
import { consumePasswordToken, hashPassword } from "@/lib/passwords";

const schema = z.object({
  token: z.string().min(20).max(200),
  newPassword: passwordSchema,
});

// POST /api/password/reset — sets a new password from an emailed reset or invite link.
export const POST = api(async (req: NextRequest) => {
  await enforceRateLimit(`reset:ip:${requestIp(req)}`, 10, 15 * 60);
  const { token, newPassword } = await parseBody(req, schema);

  const userId = await consumePasswordToken(token);
  if (!userId) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new one.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
    select: { email: true },
  });
  await clearRateLimit(loginLockKey(user.email));

  return NextResponse.json({ success: true, message: "Password set. You can now sign in." });
});
