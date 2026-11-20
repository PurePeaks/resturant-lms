import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { findPublicCertificate } from "@/lib/certificates";
import { enforceRateLimit } from "@/lib/rateLimit";
import { requestIp } from "@/lib/request";

// GET /api/verify?code=XXXX — public certificate verification for inspectors.
// `certId` and `id` are accepted for links printed before verification codes existed.
export const GET = api(async (req: NextRequest) => {
  await enforceRateLimit(`verify:ip:${requestIp(req)}`, 30, 10 * 60);

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("code") ?? searchParams.get("certId") ?? searchParams.get("id") ?? "";
  const cert = await findPublicCertificate(query);

  if (!cert) {
    return NextResponse.json(
      { valid: false, error: "No certificate matches this code." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: cert.status === "valid",
    certificate: {
      code: cert.code,
      status: cert.status,
      statusReason: cert.status === "revoked" ? cert.statusReason : null,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      recipientName: cert.recipientName,
      venueName: cert.venueName,
      courseTitle: cert.courseTitle,
      score: cert.score,
      passingThreshold: cert.passingThreshold,
      pdfUrl: cert.path,
    },
  });
});
