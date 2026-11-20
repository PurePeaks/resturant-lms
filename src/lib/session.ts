import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { Role } from "@prisma/client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  mustChangePassword: boolean;
}

/**
 * The signed-in user, loaded fresh from the database. Returns null when the
 * session is missing, the account was deactivated or erased, the venue was
 * archived, or the session was revoked (sessionVersion bumped since login).
 * Role and venue always come from the database, never from the token.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      sessionVersion: true,
      mustChangePassword: true,
      deactivatedAt: true,
      anonymizedAt: true,
      tenant: { select: { name: true, archivedAt: true } },
    },
  });

  if (!user || user.deactivatedAt || user.anonymizedAt) return null;
  if (user.sessionVersion !== (sessionUser.sessionVersion ?? 0)) return null;
  if (user.role !== "SUPER_ADMIN" && (!user.tenantId || user.tenant?.archivedAt)) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name ?? null,
    mustChangePassword: user.mustChangePassword,
  };
}

/** For route handlers: the current user, or a 401/403 ApiError. */
export async function requireUser(
  options: { roles?: Role[]; allowPendingPasswordChange?: boolean } = {}
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }
  if (user.mustChangePassword && !options.allowPendingPasswordChange) {
    throw new ApiError(403, "You must change your password before continuing.", {
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }
  if (options.roles && !options.roles.includes(user.role)) {
    throw new ApiError(403, "You don't have permission to do that.");
  }
  return user;
}

/**
 * Which venue a request may act on. Managers and staff are always confined to
 * their own venue. Super admins may pick one, or get null meaning "all venues".
 */
export function venueScope(user: CurrentUser, requestedTenantId?: string | null): string | null {
  if (user.role === "SUPER_ADMIN") {
    return requestedTenantId && requestedTenantId !== "ALL" ? requestedTenantId : null;
  }
  if (!user.tenantId) throw new ApiError(403, "Your account is not assigned to a venue.");
  return user.tenantId;
}
