/**
 * Availability engine.
 *
 * Recurring rules are stored as (UTC day-of-week, UTC minutes-from-midnight) and
 * expanded here into concrete UTC instants. Working purely in UTC is what keeps
 * the calendar stable across Egypt's DST changes: a rule that means "17:00 UTC"
 * never silently drifts by an hour, and the Cairo wall-clock time the patient
 * sees is computed at render time by Intl with the Africa/Cairo zone.
 *
 * Pure module (no database, no server-only) so it is unit-testable and reusable
 * from both the booking action and the doctor's agenda screen.
 */

export interface AvailabilityRule {
  id: string;
  dayOfWeek: number; // 0 = Sunday, matching Date#getUTCDay()
  startMinutesUTC: number;
  endMinutesUTC: number;
  slotDurationMins: number;
  isOnlineAvailable: boolean;
  isOfflineAvailable: boolean;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface BusyInterval {
  startUTC: Date;
  /** Exclusive end. */
  endUTC: Date;
}

export interface BookableSlot {
  /** ISO-8601 UTC instant, e.g. "2026-09-02T14:00:00.000Z". */
  startUTC: string;
  endUTC: string;
  durationMinutes: number;
  availabilityId: string;
}

export interface GenerateSlotsInput {
  rules: AvailabilityRule[];
  exceptions: BusyInterval[];
  busy: BusyInterval[];
  type: "ONLINE" | "OFFLINE";
  /** First UTC day to publish, as a Date at any time of that day. */
  from: Date;
  /** Number of consecutive days to publish, inclusive of `from`. */
  days: number;
  now: Date;
  minNoticeMinutes: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Midnight UTC of the day containing `date`. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Parse a YYYY-MM-DD calendar date as midnight UTC; null when malformed. */
export function parseUtcDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Half-open interval overlap: [aStart, aEnd) against [bStart, bEnd). */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

function ruleAppliesOnDay(rule: AvailabilityRule, dayStart: Date): boolean {
  if (!rule.isActive) return false;
  if (rule.dayOfWeek !== dayStart.getUTCDay()) return false;

  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  if (rule.effectiveFrom.getTime() >= dayEnd.getTime()) return false;
  if (rule.effectiveUntil && rule.effectiveUntil.getTime() < dayStart.getTime()) return false;

  return true;
}

function ruleSupportsType(rule: AvailabilityRule, type: "ONLINE" | "OFFLINE"): boolean {
  return type === "ONLINE" ? rule.isOnlineAvailable : rule.isOfflineAvailable;
}

/**
 * Expand rules into free, bookable slots.
 *
 * A slot is emitted only when it is (a) inside a rule window that supports the
 * requested consultation type, (b) at least `minNoticeMinutes` in the future,
 * (c) not inside a doctor time-off exception, and (d) not overlapping an already
 * live appointment.
 */
export function generateSlots(input: GenerateSlotsInput): BookableSlot[] {
  const { rules, exceptions, busy, type, days, now, minNoticeMinutes } = input;

  const earliest = new Date(now.getTime() + minNoticeMinutes * MINUTE_MS);
  const firstDay = startOfUtcDay(input.from);
  const slots: BookableSlot[] = [];

  const applicableRules = rules.filter((rule) => ruleSupportsType(rule, type));
  if (applicableRules.length === 0) return slots;

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const dayStart = new Date(firstDay.getTime() + dayOffset * DAY_MS);

    for (const rule of applicableRules) {
      if (!ruleAppliesOnDay(rule, dayStart)) continue;

      for (
        let minutes = rule.startMinutesUTC;
        minutes + rule.slotDurationMins <= rule.endMinutesUTC;
        minutes += rule.slotDurationMins
      ) {
        const slotStart = new Date(dayStart.getTime() + minutes * MINUTE_MS);
        const slotEnd = new Date(slotStart.getTime() + rule.slotDurationMins * MINUTE_MS);

        if (slotStart.getTime() < earliest.getTime()) continue;
        if (rule.effectiveFrom.getTime() > slotStart.getTime()) continue;
        if (rule.effectiveUntil && rule.effectiveUntil.getTime() < slotEnd.getTime()) continue;

        const blocked =
          exceptions.some((gap) => intervalsOverlap(slotStart, slotEnd, gap.startUTC, gap.endUTC)) ||
          busy.some((taken) => intervalsOverlap(slotStart, slotEnd, taken.startUTC, taken.endUTC));

        if (blocked) continue;

        slots.push({
          startUTC: slotStart.toISOString(),
          endUTC: slotEnd.toISOString(),
          durationMinutes: rule.slotDurationMins,
          availabilityId: rule.id,
        });
      }
    }
  }

  // Two rules can legitimately cover the same instant (e.g. an online-only and a
  // hybrid window); publish each instant once, earliest first.
  const deduped = new Map<string, BookableSlot>();
  for (const slot of slots) {
    if (!deduped.has(slot.startUTC)) deduped.set(slot.startUTC, slot);
  }

  return [...deduped.values()].sort((a, b) => a.startUTC.localeCompare(b.startUTC));
}

/**
 * Confirm that a requested (instant, duration) pair is a slot this doctor
 * actually publishes. Called by the reservation action before writing anything:
 * without it a caller could POST an arbitrary timestamp - 3 a.m., or a time in
 * the middle of another appointment - and the row would be created happily.
 */
export function isSlotOffered(
  slots: BookableSlot[],
  scheduledAtUTC: Date,
  durationMinutes: number,
): boolean {
  const target = scheduledAtUTC.toISOString();
  return slots.some(
    (slot) => slot.startUTC === target && slot.durationMinutes === durationMinutes,
  );
}

/** Group slots by their Cairo-local calendar day, for the booking calendar UI. */
export function groupSlotsByCairoDay(slots: BookableSlot[]): Map<string, BookableSlot[]> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const grouped = new Map<string, BookableSlot[]>();
  for (const slot of slots) {
    const key = formatter.format(new Date(slot.startUTC));
    const bucket = grouped.get(key);
    if (bucket) bucket.push(slot);
    else grouped.set(key, [slot]);
  }
  return grouped;
}
