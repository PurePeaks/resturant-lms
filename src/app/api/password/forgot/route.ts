import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, parseBody } from "@/lib/api";
import { emailSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rateLimit";
import { requestIp, baseUrlFrom } from "@/lib/request";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { createPasswordToken } from "@/lib/passwords";

const schema = z.object({ email: emailSchema });

// POST /api/password/forgot — emails a reset link. The response is identical
// whether or not the account exists.
export const POST = api(async (req: NextRequest) => {
  if (!isEmailConfigured()) {
    throw new ApiError(503, "Password reset by email isn't available yet. Ask your manager to reset your password.", {
      code: "EMAIL_NOT_CONFIGURED",
    });
  }

  await enforceRateLimit(`forgot:ip:${requestIp(req)}`, 5, 60 * 60);
  const { email } = await parseBody(req, schema);
  await enforceRateLimit(`forgot:email:${email}`, 3, 60 * 60);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, deactivatedAt: true, anonymizedAt: true },
  });

  if (user && !user.deactivatedAt && !user.anonymizedAt) {
    const token = await createPasswordToken(user.id, "reset");
    const link = `${baseUrlFrom(req.headers)}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: "Reset your Himalayan Reserves password",
      text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in 1 hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }

  return NextResponse.json({
    success: true,
    message: "If an account exists for that email, a reset link is on its way.",
  });
});
