import { prisma } from "@/lib/prisma";

/**
 * Retention policy: offboarded users are deactivated, not deleted, so their
 * training and certificate history stays in compliance exports. Three years
 * after deactivation their name and email are erased; the training records
 * remain, attributed to "Former staff member".
 */
export const RETENTION_YEARS = 3;

export function retentionCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RETENTION_YEARS);
  return cutoff;
}

/** Erases a user's personal data while keeping their training records. */
export async function anonymizeUser(userId: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Former staff member",
        email: `erased-${userId}@invalid.local`,
        // Not a valid bcrypt hash, so no password can ever match it.
        passwordHash: "!erased",
        anonymizedAt: now,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    }),
  ]);
  // Keep deactivatedAt if it was already set; set it otherwise.
  await prisma.user.updateMany({ where: { id: userId, deactivatedAt: null }, data: { deactivatedAt: now } });
}

/** Anonymizes everyone deactivated longer ago than the retention period. */
export async function applyRetentionPolicy(now: Date = new Date()): Promise<number> {
  const due = await prisma.user.findMany({
    where: { deactivatedAt: { lt: retentionCutoff(now) }, anonymizedAt: null },
    select: { id: true },
  });
  for (const { id } of due) {
    await anonymizeUser(id);
  }
  return due.length;
}
