import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/session";

export type AuditAction =
  | "staff.created"
  | "user.created"
  | "user.updated"
  | "user.deactivated"
  | "user.reactivated"
  | "user.erased"
  | "user.password_reset"
  | "user.password_changed"
  | "training.reset"
  | "venue.created"
  | "venue.renamed"
  | "venue.archived"
  | "venue.restored"
  | "module.created"
  | "module.updated"
  | "module.quiz_changed"
  | "module.reordered"
  | "module.archived"
  | "module.deleted"
  | "certificate.issued"
  | "equipment.deleted"
  | "inquiry.updated"
  | "retention.anonymized";

interface AuditEntry {
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Records an audit entry. Failures are logged but never break the request:
 * the action already happened, and losing a log line beats a 500.
 */
export async function audit(actor: Pick<CurrentUser, "id" | "name" | "role"> | null, entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? "System",
        actorRole: actor?.role ?? "SYSTEM",
        tenantId: entry.tenantId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        summary: entry.summary,
        details: entry.details,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", entry.action, err);
  }
}
