import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { normalizeEmail } from "@/lib/validation";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter stored in Postgres. The upsert is a single atomic
 * statement, so concurrent requests cannot both slip under the limit.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"
  `;

  const { count, resetAt } = rows[0];
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)),
  };
}

/** Throws a 429 when the limit is exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const result = await rateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    throw new ApiError(429, "Too many requests. Please wait and try again.", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Failed sign-ins are counted per email; resetting a password clears the lock. */
export function loginLockKey(email: string): string {
  return `login:email:${normalizeEmail(email)}`;
}
