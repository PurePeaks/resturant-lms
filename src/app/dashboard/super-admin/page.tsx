export const instant = false;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import SuperAdminView from "@/components/ui/SuperAdminView";

export default async function SuperAdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session");
  if (user.mustChangePassword) redirect("/change-password");

  if (user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return <SuperAdminView />;
}
