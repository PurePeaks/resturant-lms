import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { requireManageableUser, resetTraining } from "@/lib/people";
import { idSchema } from "@/lib/validation";

const schema = z.object({
  userId: idSchema,
  moduleId: idSchema.optional(),
});

// POST /api/manager/staff/reset — make a staff member redo one module or all training.
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["MANAGER", "SUPER_ADMIN"] });
  const { userId, moduleId } = await parseBody(req, schema);
  const target = await requireManageableUser(user, userId);

  await resetTraining(user, target, moduleId ?? null);

  return NextResponse.json({ success: true, userId, moduleId: moduleId ?? "all" });
});
