/**
 * Cairo time conversion helpers.
 *
 * Availability rules and recurring schedules are stored in UTC minutes-from-midnight
 * in the database. When editing schedules in the UI, consultants and receptionists
 * enter hours on the Cairo clock.
 *
 * Uses a fixed winter offset (UTC+2) to keep recurring schedules deterministic
 * across daylight saving time switchovers.
 */

export const CAIRO_WINTER_OFFSET_HOURS = 2;

export const DAY_NAMES_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

export const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** UTC minutes-from-midnight (0..1439) -> "HH:MM" on the Cairo clock. */
export function utcMinutesToCairoLabel(minutes: number): string {
  const total = ((minutes + CAIRO_WINTER_OFFSET_HOURS * 60) % 1440 + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** "HH:MM" Cairo wall-clock -> UTC minutes-from-midnight (0..1439). */
export function cairoLabelToUtcMinutes(label: string): number {
  const [hoursStr, minsStr] = label.split(":");
  const hours = Number(hoursStr) || 0;
  const mins = Number(minsStr) || 0;
  const total = (hours - CAIRO_WINTER_OFFSET_HOURS) * 60 + mins;
  return ((total % 1440) + 1440) % 1440;
}

/** Convert a local Cairo date string ("YYYY-MM-DDTHH:mm") to UTC Date. */
export function cairoDateTimeLocalToUtc(dateTimeLocal: string): Date | null {
  if (!dateTimeLocal) return null;
  const [datePart, timePart] = dateTimeLocal.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    hours === undefined ||
    minutes === undefined
  ) {
    return null;
  }

  // Create date in UTC subtracting the Cairo offset (2 hours)
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hours - CAIRO_WINTER_OFFSET_HOURS, minutes),
  );

  return Number.isNaN(utcDate.getTime()) ? null : utcDate;
}

/** Convert a UTC Date to "YYYY-MM-DDTHH:mm" in Cairo time for datetime-local inputs. */
export function utcDateToCairoDateTimeLocal(date: Date): string {
  const cairoTime = new Date(date.getTime() + CAIRO_WINTER_OFFSET_HOURS * 60 * 60 * 1000);
  const year = cairoTime.getUTCFullYear();
  const month = String(cairoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(cairoTime.getUTCDate()).padStart(2, "0");
  const hours = String(cairoTime.getUTCHours()).padStart(2, "0");
  const minutes = String(cairoTime.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
