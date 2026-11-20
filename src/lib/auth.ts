export type UserRole = "SUPER_ADMIN" | "MANAGER" | "STAFF";

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  MANAGER: "/dashboard/manager",
  STAFF: "/dashboard/staff",
};


