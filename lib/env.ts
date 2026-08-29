import "server-only";
import { z } from "zod";

/**
 * Fail-fast environment validation.
 *
 * Imported by every server module that needs configuration, so a missing or
 * malformed variable crashes the process at boot rather than producing a
 * half-working booking flow in production.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z
    .string()
    .url("APP_URL must be an absolute URL, e.g. https://asmaaclinic.com")
    .transform((value) => value.replace(/\/+$/, "")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters of entropy"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  UPLOAD_DIR: z.string().min(1).default("./.uploads/receipts"),
  MAX_RECEIPT_BYTES: z.coerce.number().int().min(50_000).max(20_000_000).default(5_242_880),

  /**
   * Vercel Blob write token. Present on Vercel, absent locally.
   *
   * Its presence is what selects the receipt storage backend: with a token,
   * receipts go to a PRIVATE Blob store; without one they go to `UPLOAD_DIR` on
   * local disk. Serverless filesystems are ephemeral and read-only outside
   * /tmp, so the local path cannot be used in production — see lib/uploads.ts.
   */
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  BOOKING_HOLD_MINUTES: z.coerce.number().int().min(5).max(1440).default(45),
  BOOKING_MIN_NOTICE_MINUTES: z.coerce.number().int().min(0).max(10_080).default(120),
  BOOKING_HORIZON_DAYS: z.coerce.number().int().min(1).max(180).default(21),

  CLINIC_INSTAPAY_HANDLE: z.string().min(1).default("asmaaclinic@instapay"),
  CLINIC_VODAFONE_CASH_NUMBERS: z.string().min(1).default("+201001234567"),
  CLINIC_WHATSAPP_NUMBER: z.string().min(1).default("+201001234567"),
  CLINIC_NAME_AR: z.string().min(1).default("مركز أسما للصحة النفسية"),
  CLINIC_ADDRESS_AR: z.string().min(1).default("القاهرة الجديدة، التجمع الخامس"),
  CLINIC_MAPS_URL: z.string().url().default("https://maps.google.com/?q=30.0271,31.4835"),
  CRON_SECRET: z
    .string()
    .min(32, "CRON_SECRET must be at least 32 characters of entropy"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Copy .env.example to .env and fix:\n${details}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
