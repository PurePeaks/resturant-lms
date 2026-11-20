export const instant = false;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import StaffView from "@/components/ui/StaffView";

export default async function StaffDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session");
  if (user.mustChangePassword) redirect("/change-password");

  return <StaffView staffName={user.name} tenantName={user.tenantName || "Restaurant"} />;
}
