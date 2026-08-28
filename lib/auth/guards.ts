import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/domain/enums";
import { ActionResult, Failures, success } from "@/lib/result";
import { AuthContext, getAuthContext, hasRole } from "@/lib/auth/session";
import { verifyCsrfFromForm } from "@/lib/auth/csrf";

export type { AuthContext };

/**
 * Authorisation helpers.
 *
 * Two flavours, because Server Actions and Server Components need different
 * failure behaviour:
 *   - `requireRole*` returns an ActionResult, so an action can surface a
 *     localised error to the form instead of crashing the render.
 *   - `requireRolePage` redirects, which is the right behaviour for a route.
 *
 * Route guards live here rather than only in middleware.ts on purpose:
 * middleware protects navigation, but a Server Action invoked directly by a
 * crafted POST never passes through a page route. Every privileged action
 * re-checks the role at the data layer.
 */

/** Guard a Server Action: verifies session, role, and the CSRF token together. */
export async function requireRole(
  allowed: readonly Role[],
  formData?: FormData,
): Promise<ActionResult<AuthContext>> {
  if (formData && !(await verifyCsrfFromForm(formData))) {
    return Failures.csrf();
  }

  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();
  if (!hasRole(auth.user.role, allowed)) return Failures.forbidden();

  return success(auth);
}

/** Guard a Server Action that only needs an authenticated caller of any role. */
export async function requireAuth(formData?: FormData): Promise<ActionResult<AuthContext>> {
  return requireRole(["PATIENT", "DOCTOR", "ADMIN"], formData);
}

/**
 * Guard a Server Component / page. Redirects instead of returning an error.
 * `next` carries the original path so login can bounce the user back.
 */
export async function requireRolePage(
  allowed: readonly Role[],
  currentPath: string,
): Promise<AuthContext> {
  const auth = await getAuthContext();

  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }
  if (!hasRole(auth.user.role, allowed)) {
    redirect("/403");
  }

  return auth;
}

/** Landing route for a user, used after login and by the navbar. */
export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin/verification";
    case "DOCTOR":
      return "/dashboard/doctor";
    default:
      return "/dashboard/patient";
  }
}
