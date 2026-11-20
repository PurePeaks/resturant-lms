import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { SUPERSEDED_REASON, certificatePath, certificateStatus, formatVerificationCode } from "@/lib/training";

// GET /api/staff/certificates — the signed-in staff member's certificates
export const GET = api(async () => {
  const user = await requireUser({ roles: ["STAFF"] });

  const certs = await prisma.certificate.findMany({
    where: { userId: user.id },
    include: { module: { select: { title: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json(
    certs
      // Superseded certificates are replaced by a newer one; hide them.
      .filter((c) => c.revokedReason !== SUPERSEDED_REASON)
      .map((c) => ({
        id: c.id,
        moduleId: c.moduleId,
        moduleName: c.module.title,
        pdfUrl: certificatePath(c.verificationCode),
        verificationCode: formatVerificationCode(c.verificationCode),
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        status: certificateStatus(c),
      }))
  );
});
