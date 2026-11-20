import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser, venueScope } from "@/lib/session";
import { SUPERSEDED_REASON, certificateStatus, formatVerificationCode } from "@/lib/training";

function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Neutralize spreadsheet formula triggers (=, +, -, @, tabs, returns)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

const day = (d: Date | null | undefined) => (d ? d.toISOString().split("T")[0] : "N/A");

// GET /api/manager/export/compliance — inspector CSV: every staff member (current
// and former) against every module of their venue.
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const tenantId = venueScope(user, req.nextUrl.searchParams.get("tenantId"));

  const tenants = await prisma.tenant.findMany({
    where: tenantId ? { id: tenantId } : {},
    select: {
      id: true,
      name: true,
      modules: {
        where: { archivedAt: null, publishedAt: { not: null } },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, durationSeconds: true },
      },
      users: {
        where: { role: "STAFF" },
        orderBy: { name: "asc" },
        select: {
          name: true,
          email: true,
          deactivatedAt: true,
          watchProgress: true,
          quizAttempts: { where: { voidedAt: null }, orderBy: { createdAt: "desc" } },
          certificates: { orderBy: { issuedAt: "desc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const headers = [
    "Venue",
    "Staff Name",
    "Email",
    "Employment Status",
    "Module Name",
    "Video Progress (%)",
    "Video Completed",
    "Latest Quiz Score (%)",
    "Quiz Passed",
    "Certificate Code",
    "Certificate Status",
    "Certified Date",
    "Expires",
  ];

  const rows: string[][] = [];
  const now = new Date();

  for (const t of tenants) {
    for (const s of t.users) {
      const status = s.deactivatedAt ? `Former (left ${day(s.deactivatedAt)})` : "Active";
      for (const m of t.modules) {
        const wp = s.watchProgress.find((w) => w.moduleId === m.id);
        const attempt = s.quizAttempts.find((a) => a.moduleId === m.id);
        const cert = s.certificates.find((c) => c.moduleId === m.id && c.revokedReason !== SUPERSEDED_REASON);
        const duration = m.durationSeconds ?? wp?.durationSeconds ?? 0;
        const percent = wp && duration > 0 ? Math.min(100, Math.round((wp.maxWatchedSeconds / duration) * 100)) : 0;

        rows.push([
          t.name,
          s.name,
          s.email,
          status,
          m.title,
          `${percent}%`,
          wp?.completed ? "Yes" : "No",
          attempt ? `${attempt.score}%` : "Not attempted",
          attempt?.passed ? "Yes" : "No",
          cert ? formatVerificationCode(cert.verificationCode) : "N/A",
          cert ? certificateStatus(cert, now) : "None",
          day(cert?.issuedAt),
          cert ? (cert.expiresAt ? day(cert.expiresAt) : "Never") : "N/A",
        ].map(sanitizeCsvCell));
      }
    }
  }

  const csvContent = [headers.map(sanitizeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");

  const label = tenantId ? (tenants[0]?.name ?? "venue") : "all_venues";
  const safeLabel = label.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeLabel}_compliance_report_${day(now)}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
