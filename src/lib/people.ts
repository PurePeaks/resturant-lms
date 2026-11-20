import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { clearRateLimit, loginLockKey } from "@/lib/rateLimit";
import { createPasswordToken, generateTemporaryPassword, hashPassword } from "@/lib/passwords";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import type { CurrentUser } from "@/lib/session";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "STAFF";
  tenantId: string | null;
  deactivatedAt: Date | null;
}

/**
 * Loads a user the actor is allowed to manage. Managers may only manage staff
 * in their own venue; super admins may manage anyone. Nobody manages
 * themselves through these endpoints, and erased accounts are read-only.
 */
export async function requireManageableUser(actor: CurrentUser, targetId: string): Promise<ManagedUser> {
  if (targetId === actor.id) {
    throw new ApiError(400, "Use your own account settings to change your account.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, role: true, tenantId: true, deactivatedAt: true, anonymizedAt: true },
  });
  if (!target || target.anonymizedAt) throw new ApiError(404, "User not found");

  if (actor.role === "MANAGER") {
    if (target.tenantId !== actor.tenantId) throw new ApiError(404, "User not found");
    if (target.role !== "STAFF") throw new ApiError(403, "Managers can only manage staff members.");
  } else if (actor.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "You don't have permission to do that.");
  }

  return target;
}

/**
 * Resets a password to a random temporary one, returned once for the actor to
 * hand over. Existing sessions end and the user must choose a new password.
 * (Not emailed: staff addresses aren't always real inboxes, and a lost link
 * would leave them locked out. People with a working inbox can use
 * "Forgot password" themselves.)
 */
export async function resetUserPassword(actor: CurrentUser, target: ManagedUser): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      sessionVersion: { increment: 1 },
    },
  });

  await clearRateLimit(loginLockKey(target.email));
  await audit(actor, {
    action: "user.password_reset",
    targetType: "user",
    targetId: target.id,
    tenantId: target.tenantId,
    summary: `${actor.name} reset the password for ${target.name}`,
  });

  return temporaryPassword;
}

/**
 * Emails a new account holder a link to set their own password (valid 72
 * hours). Their temporary password still works, so a missing or mistyped
 * address never blocks them. Returns whether the email was sent.
 */
export async function sendWelcomeEmail(
  user: { id: string; name: string; email: string },
  baseUrl: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const token = await createPasswordToken(user.id, "invite");
  return sendEmail({
    to: user.email,
    subject: "Your Himalayan Reserves training account",
    text: [
      `Hi ${user.name},`,
      "",
      "An account has been created for you on the Himalayan Reserves training portal.",
      "",
      "Choose your password here (the link works once and expires in 3 days):",
      `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
      "",
      `Then sign in at ${baseUrl}/login with this email address.`,
      "",
      "If your manager already gave you a temporary password, you can use that instead.",
    ].join("\n"),
  });
}

/** Offboards a user: they can no longer sign in, but their records are kept. */
export async function deactivateUser(actor: CurrentUser, target: ManagedUser): Promise<void> {
  if (target.deactivatedAt) return;
  await prisma.user.update({
    where: { id: target.id },
    data: { deactivatedAt: new Date(), sessionVersion: { increment: 1 } },
  });
  await audit(actor, {
    action: "user.deactivated",
    targetType: "user",
    targetId: target.id,
    tenantId: target.tenantId,
    summary: `${actor.name} offboarded ${target.name}`,
  });
}

export async function reactivateUser(actor: CurrentUser, target: ManagedUser): Promise<void> {
  if (!target.deactivatedAt) return;
  await prisma.user.update({ where: { id: target.id }, data: { deactivatedAt: null } });
  await audit(actor, {
    action: "user.reactivated",
    targetType: "user",
    targetId: target.id,
    tenantId: target.tenantId,
    summary: `${actor.name} reactivated ${target.name}`,
  });
}

/**
 * Makes a staff member redo training. Certificates are revoked (not deleted)
 * and quiz attempts are voided (kept for history, no longer counted), so the
 * compliance record shows what happened.
 */
export async function resetTraining(actor: CurrentUser, target: ManagedUser, moduleId: string | null): Promise<void> {
  const scope = moduleId ? { userId: target.id, moduleId } : { userId: target.id };
  const now = new Date();

  await prisma.$transaction([
    prisma.watchProgress.deleteMany({ where: scope }),
    prisma.quizAttempt.updateMany({ where: { ...scope, voidedAt: null }, data: { voidedAt: now } }),
    prisma.certificate.updateMany({
      where: { ...scope, revokedAt: null },
      data: { revokedAt: now, revokedReason: `Training reset by ${actor.name}` },
    }),
  ]);

  const moduleTitle = moduleId
    ? (await prisma.module.findUnique({ where: { id: moduleId }, select: { title: true } }))?.title
    : null;

  await audit(actor, {
    action: "training.reset",
    targetType: "user",
    targetId: target.id,
    tenantId: target.tenantId,
    summary: moduleTitle
      ? `${actor.name} reset ${target.name}'s training for "${moduleTitle}"`
      : `${actor.name} reset all of ${target.name}'s training`,
    details: { moduleId },
  });
}
