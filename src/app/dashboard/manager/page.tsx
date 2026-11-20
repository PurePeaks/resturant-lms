export const instant = false;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ManagerView from "@/components/ui/ManagerView";

export default async function ManagerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session");
  if (user.mustChangePassword) redirect("/change-password");

  if (user.role !== "MANAGER" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard/staff");
  }

  return <ManagerView tenantName={user.tenantName || "Restaurant"} managerName={user.name} />;
}
