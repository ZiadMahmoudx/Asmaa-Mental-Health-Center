import type { Prisma } from "@prisma/client";

/**
 * Boundary conversions between Prisma values and plain, serialisable data.
 *
 * Two problems this solves:
 *  1. `Decimal` (prices) is a class instance. Passing it from a Server Component
 *     into a Client Component throws "Only plain objects can be passed to Client
 *     Components". Every price crosses the boundary through `toNumber` below.
 *  2. Scalar string lists exist on PostgreSQL but not on SQL Server, where the
 *     same columns are JSON-encoded text (see the provider notes in
 *     prisma/schema.prisma). `toStringArray` reads both shapes, so switching
 *     providers does not require touching call sites.
 */

/** Prisma Decimal | number | string | null -> number. */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return value.toNumber();
}

/** Money for display: EGP is quoted in whole pounds throughout the clinic. */
export function toEgp(value: Prisma.Decimal | number | string | null | undefined): number {
  return Math.round(toNumber(value));
}

/** Reads a PostgreSQL `String[]` or a SQL Server JSON-encoded text column. */
export function toStringArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    // Legacy rows may hold a plain comma-separated list.
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

/** Inverse of {@link toStringArray} for the SQL Server column shape. */
export function fromStringArray(values: string[]): string {
  return JSON.stringify(values);
}

/** Dates cross the RSC boundary as ISO strings to avoid timezone re-parsing. */
export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
