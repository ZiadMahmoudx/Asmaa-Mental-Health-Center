import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEquals } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Background cron endpoint to identify and stamp sessions due for 24-hour reminders.
 *
 * Scans for CONFIRMED sessions between [now + 22h, now + 26h] with reminderSentAt === null.
 * Protected with Bearer CRON_SECRET compared in constant time.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "");

  if (!env.CRON_SECRET || !safeEquals(providedSecret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 22 * HOUR_MS);
  const windowEnd = new Date(now.getTime() + 26 * HOUR_MS);

  try {
    const dueAppointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSentAt: null,
        scheduledAtUTC: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true, patientId: true, scheduledAtUTC: true },
    });

    let processedCount = 0;

    for (const app of dueAppointments) {
      const updated = await prisma.appointment.updateMany({
        where: { id: app.id, reminderSentAt: null },
        data: { reminderSentAt: now },
      });

      if (updated.count === 1) {
        processedCount += 1;
      }
    }

    if (processedCount > 0) {
      await recordAudit({
        actorId: null,
        action: "HOLDS_RELEASED_BY_CRON", // Or dedicated reminder audit
        entityType: "Appointment",
        entityId: "system_reminder_cron",
        metadata: { stampedRemindersCount: processedCount },
      });
    }

    return NextResponse.json({
      ok: true,
      stampedCount: processedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/send-reminders] Failed to process reminders:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
