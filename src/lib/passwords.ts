import { createHash, randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;

// Unambiguous characters (no 0/O, 1/l/I) so temporary passwords can be read aloud.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random 16-character password in four groups, e.g. "aB3d-Ef9h-Jk2m-Np7q". */
export function generateTemporaryPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) group += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(group);
  }
  return groups.join("-");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the email is unknown, so a missing account takes as
// long to reject as a wrong password and emails can't be probed by timing.
const DUMMY_HASH = "$2b$12$JY/PvlngSZrE1dm7hoTObu52E13oIfz6zsfdQ0Z9LrAVK5a6dls2m";

export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type TokenPurpose = "reset" | "invite";

/** Creates a single-use token. Only its hash is stored; the raw token goes in the link. */
export async function createPasswordToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const ttlHours = purpose === "invite" ? 72 : 1;
  await prisma.passwordResetToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    },
  });
  return token;
}

/** Marks the token used and returns its user id, or null if invalid, used or expired. */
export async function consumePasswordToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  // Conditional update so two simultaneous uses can't both succeed.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? record.userId : null;
}
