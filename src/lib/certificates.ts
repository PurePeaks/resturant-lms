import { prisma } from "@/lib/prisma";
import {
  PASS_THRESHOLD,
  certificatePath,
  certificateStatus,
  formatVerificationCode,
  normalizeVerificationCode,
  type CertificateStatus,
} from "@/lib/training";

export interface PublicCertificate {
  id: string;
  code: string;
  status: CertificateStatus;
  statusReason: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  recipientName: string;
  venueName: string;
  courseTitle: string;
  courseDescription: string | null;
  score: number | null;
  passingThreshold: number;
  path: string;
}

/**
 * Looks a certificate up by its verification code or its id, exact match
 * only. (Partial matching used to let anyone enumerate every certificate.)
 */
export async function findPublicCertificate(rawId: string): Promise<PublicCertificate | null> {
  const id = rawId.trim().replace(/\.html$/, "");
  if (!id || id.length > 64) return null;

  const cert = await prisma.certificate.findFirst({
    where: { OR: [{ verificationCode: normalizeVerificationCode(id) }, { id }] },
    include: {
      user: { select: { name: true, tenant: { select: { name: true } } } },
      module: { select: { title: true, description: true } },
    },
  });
  if (!cert) return null;

  return {
    id: cert.id,
    code: formatVerificationCode(cert.verificationCode),
    status: certificateStatus(cert),
    statusReason: cert.revokedReason,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    recipientName: cert.user.name,
    venueName: cert.user.tenant?.name ?? "Unknown venue",
    courseTitle: cert.module.title,
    courseDescription: cert.module.description,
    score: cert.score,
    passingThreshold: PASS_THRESHOLD,
    path: certificatePath(cert.verificationCode),
  };
}
