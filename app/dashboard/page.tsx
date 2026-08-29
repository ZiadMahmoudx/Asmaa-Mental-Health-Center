import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/guards";

/**
 * Role dispatcher. Middleware sends signed-in visitors here from /login, and the
 * navbar links here generically; this is the one place that decides which
 * dashboard a role actually belongs in.
 */
export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const auth = await getAuthContext();

  if (!auth) redirect("/login?next=%2Fdashboard");
  redirect(dashboardPathForRole(auth.user.role));
}
