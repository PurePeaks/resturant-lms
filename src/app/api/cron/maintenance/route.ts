import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import { applyRetentionPolicy } from "@/lib/retention";
import { audit } from "@/lib/audit";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// GET /api/cron/maintenance — daily housekeeping, called by Vercel Cron (see
// vercel.json) with "Authorization: Bearer $CRON_SECRET".
export const GET = api(async (req: NextRequest) => {
  if (!authorized(req)) throw new ApiError(401, "Unauthorized");

  const now = new Date();
  const anonymized = await applyRetentionPolicy(now);
  if (anonymized > 0) {
    await audit(null, {
      action: "retention.anonymized",
      targetType: "user",
      summary: `Retention policy erased personal data of ${anonymized} former staff member(s)`,
    });
  }

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [tokens, rateLimits] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: dayAgo } }] } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  return NextResponse.json({
    ok: true,
    anonymizedUsers: anonymized,
    deletedTokens: tokens.count,
    deletedRateLimits: rateLimits.count,
  });
});
