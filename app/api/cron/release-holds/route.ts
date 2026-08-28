import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEquals } from "@/lib/auth/password";
import { releaseExpiredHoldsAction } from "@/app/actions/booking.actions";
import { recordAudit } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

/**
 * Background cron endpoint to release expired unpaid booking holds.
 *
 * Protected with a shared secret compared in constant time to prevent
 * unauthorized invocation.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "");

  if (!env.CRON_SECRET || !safeEquals(providedSecret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await releaseExpiredHoldsAction();
    if (result.ok && result.data.releasedCount > 0) {
      await recordAudit({
        actorId: null,
        action: "HOLDS_RELEASED_BY_CRON",
        entityType: "Appointment",
        entityId: "system_cron",
        metadata: { releasedCount: result.data.releasedCount },
      });
    }

    return NextResponse.json({
      ok: true,
      releasedCount: result.ok ? result.data.releasedCount : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/release-holds] Failed to release expired holds:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
