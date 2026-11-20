import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deactivateUser, requireManageableUser } from "@/lib/people";

// DELETE /api/manager/staff/[id] — offboard a staff member. The account is
// deactivated rather than deleted, so their training records stay on file.
export const DELETE = api(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { id } = await params;
  const target = await requireManageableUser(user, id);

  await deactivateUser(user, target);

  return NextResponse.json({
    success: true,
    message: `${target.name} was offboarded. Their training records are kept.`,
  });
});
